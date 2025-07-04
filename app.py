import logging
from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fuzzywuzzy import fuzz
import json
import cloudinary
import cloudinary.uploader
from requests.auth import HTTPBasicAuth
from plexapi.server import PlexServer
from io import BytesIO
from PIL import Image

def get_current_month_year():
    current_date = datetime.now()
    return current_date.strftime("%B %Y")

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

# Load environment variables
load_dotenv(override=True)   # ← now .env always wins

PLEX_URL = os.getenv('PLEX_URL')
PLEX_TOKEN = os.getenv('PLEX_TOKEN')
OVERSEERR_API_URL = os.getenv('OVERSEERR_API_URL')
OVERSEERR_API_KEY = os.getenv('OVERSEERR_API_KEY')
RADARR_API_URL = os.getenv('RADARR_API_URL')
RADARR_API_KEY = os.getenv('RADARR_API_KEY')
SONARR_API_URL = os.getenv('SONARR_API_URL')
SONARR_API_KEY = os.getenv('SONARR_API_KEY')
STALE_MONTHS = int(os.getenv('STALE_MONTHS', 3))

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

# Listmonk configuration
LISTMONK_API_URL = os.getenv('LISTMONK_API_URL')
LISTMONK_API_USER = os.getenv('LISTMONK_API_USER', 'staleflix_api')
LISTMONK_API_KEY = os.getenv('LISTMONK_API_KEY')
LISTMONK_LIST_ID = os.getenv('LISTMONK_LIST_ID')
LISTMONK_FROM_EMAIL = os.getenv('LISTMONK_FROM_EMAIL')

CACHE_FILE = 'stale_content_cache.json'

def get_plex_headers():
    return {
        'X-Plex-Token': PLEX_TOKEN,
        'Accept': 'application/xml',
        'Accept-Charset': 'utf-8'
    }

def get_overseerr_headers():
    return {
        'X-Api-Key': OVERSEERR_API_KEY,
        'Accept': 'application/json'
    }

def get_radarr_headers():
    return {
        'X-Api-Key': RADARR_API_KEY,
        'Accept': 'application/json'
    }

def get_sonarr_headers():
    return {
        'X-Api-Key': SONARR_API_KEY,
        'Accept': 'application/json'
    }

def get_listmonk_auth():
    return HTTPBasicAuth(LISTMONK_API_USER, LISTMONK_API_KEY)

def fetch_overseerr_requests():
    all_requests = []
    page = 1
    while True:
        response = requests.get(
            f"{OVERSEERR_API_URL}/request",
            params={'take': 100, 'skip': (page - 1) * 100, 'filter': 'all'},
            headers=get_overseerr_headers()
        )
        response.raise_for_status()
        data = response.json()
        all_requests.extend(data['results'])
        if len(all_requests) >= data['pageInfo']['results']:
            break
        page += 1
    return all_requests

def create_requester_mapping(overseerr_requests):
    requester_mapping = {}
    for request in overseerr_requests:
        if 'media' in request and 'ratingKey' in request['media']:
            requester_mapping[request['media']['ratingKey']] = request['requestedBy']['displayName']
    return requester_mapping

def fetch_radarr_movies():
    response = requests.get(f"{RADARR_API_URL}/movie", headers=get_radarr_headers())
    response.raise_for_status()
    return {movie['title']: movie for movie in response.json()}

def fetch_sonarr_series():
    response = requests.get(f"{SONARR_API_URL}/series", headers=get_sonarr_headers())
    response.raise_for_status()
    return {series['title']: series for series in response.json()}

def fetch_plex_content(requester_mapping, radarr_movies, sonarr_series):
    stale_content = []
    try:
        accounts_response = requests.get(f"{PLEX_URL}/accounts", headers=get_plex_headers())
        accounts_response.raise_for_status()
        accounts_root = ET.fromstring(accounts_response.content)
        users = {account.get('id'): account.get('name') for account in accounts_root.findall('Account')}

        libraries_response = requests.get(f"{PLEX_URL}/library/sections", headers=get_plex_headers())
        libraries_response.raise_for_status()
        libraries_root = ET.fromstring(libraries_response.content)

        for directory in libraries_root.findall(".//Directory"):
            library_key = directory.get('key')
            library_type = directory.get('type')

            if library_type in ['movie', 'show']:
                items_response = requests.get(f"{PLEX_URL}/library/sections/{library_key}/all", headers=get_plex_headers())
                items_response.raise_for_status()
                items_root = ET.fromstring(items_response.content)

                for item in items_root.findall('./Video') if library_type == 'movie' else items_root.findall('./Directory'):
                    try:
                        stale_item = process_item(item, library_type, users, requester_mapping, radarr_movies, sonarr_series)
                        if stale_item:
                            stale_content.append(stale_item)
                    except Exception as e:
                        logging.error(f"Error processing item: {e}")

    except requests.RequestException as e:
        logging.error(f"Error fetching Plex content: {e}")

    return stale_content

def check_if_stale(watch_status, library_type, added_at):
    if not watch_status:
        return (datetime.now() - added_at) > timedelta(days=30 * STALE_MONTHS)

    current_time = datetime.now()
    stale_threshold = current_time - timedelta(days=30 * STALE_MONTHS)

    for status in watch_status.values():
        if library_type == 'show':
            if status != "0.00%":
                return False
        else:
            if status == "Watched":
                return False

    return added_at < stale_threshold

def process_item(item, library_type, users, requester_mapping, radarr_movies, sonarr_series):
    title = item.get('title', 'Unknown Title')
    original_title = item.get('originalTitle', title)
    
    try:
        title = title.encode('latin1').decode('utf-8') if isinstance(title, str) else title
        original_title = original_title.encode('latin1').decode('utf-8') if isinstance(original_title, str) else original_title
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass

    added_at = datetime.fromtimestamp(int(item.get('addedAt', 0)))
    plex_id = item.get('ratingKey')

    if library_type == 'show':
        leaf_count = int(item.get('leafCount', 0))
        watch_status = fetch_series_watch_status(plex_id, leaf_count, users)
    else:
        watch_status = fetch_movie_watch_status(plex_id, users)

    is_stale = check_if_stale(watch_status, library_type, added_at)

    if is_stale:
        requester = requester_mapping.get(plex_id, "Unknown")
        size = get_content_size(title, library_type, radarr_movies, sonarr_series)
        poster_url = f"{PLEX_URL}{item.get('thumb')}?X-Plex-Token={PLEX_TOKEN}"
        
        return {
            "title": title,
            "original_title": original_title,
            "type": library_type,
            "added_at": added_at.strftime('%Y-%m-%d'),
            "plex_id": plex_id,
            "requester": requester,
            "size": f"{size:.2f}" if size is not None else "0",
            "watch_status": watch_status,
            "total_episodes": leaf_count if library_type == 'show' else None,
            "requester_watched": check_requester_watched(requester, watch_status),
            "poster_url": poster_url
        }
    
    return None

def get_content_size(title, library_type, radarr_movies, sonarr_series):
    if library_type == 'movie':
        matched_movie = find_best_match(title, radarr_movies)
        if matched_movie:
            return matched_movie['sizeOnDisk'] / (1024 * 1024 * 1024)
    else:
        matched_series = find_best_match(title, sonarr_series)
        if matched_series:
            return matched_series['statistics']['sizeOnDisk'] / (1024 * 1024 * 1024)
    return None

def find_best_match(title, items):
    best_match = None
    best_ratio = 0
    title_lower = title.lower()
    
    for item_title, item_data in items.items():
        ratio = fuzz.ratio(title_lower, item_title.lower())
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = item_data
    return best_match if best_ratio > 85 else None

def fetch_series_watch_status(series_key, total_episodes, users):
    watch_status = {}
    for user_id, username in users.items():
        try:
            history_response = requests.get(f"{PLEX_URL}/status/sessions/history/all?accountID={user_id}&metadataItemID={series_key}", headers=get_plex_headers())
            history_response.raise_for_status()
            history_root = ET.fromstring(history_response.content)
            watched_episodes = len(history_root.findall('.//Video'))
            if watched_episodes > 0:
                watch_percentage = (watched_episodes / total_episodes) * 100 if total_episodes > 0 else 0
                watch_status[username] = f"{watch_percentage:.2f}%"
        except requests.RequestException as e:
            logging.error(f"Error fetching watch status for user {username}: {e}")
    return watch_status

def fetch_movie_watch_status(movie_key, users):
    watch_status = {}
    for user_id, username in users.items():
        try:
            history_response = requests.get(f"{PLEX_URL}/status/sessions/history/all?accountID={user_id}&metadataItemID={movie_key}", headers=get_plex_headers())
            history_response.raise_for_status()
            history_root = ET.fromstring(history_response.content)
            watched = len(history_root.findall('.//Video')) > 0
            if watched:
                watch_status[username] = "Watched"
        except requests.RequestException as e:
            logging.error(f"Error fetching watch status for user {username}: {e}")
    return watch_status

def check_requester_watched(requester, watch_status):
    return requester in watch_status and (
        watch_status[requester] == "Watched" or 
        (isinstance(watch_status[requester], str) and watch_status[requester].endswith("%") and float(watch_status[requester][:-1]) > 0)
    )

def save_cache(data):
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)

def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

def process_image(image_data, max_width=600, initial_quality=85, min_quality=60, target_size=250*1024):
    img = Image.open(BytesIO(image_data))
    
    # Convert to RGB if the image is in RGBA mode
    if img.mode == 'RGBA':
        img = img.convert('RGB')
    
    # Resize the image if it's wider than max_width
    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.LANCZOS)
    
    # Start with the initial quality
    quality = initial_quality
    
    while quality >= min_quality:
        output = BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True, progressive=True)
        size = output.tell()
        
        if size <= target_size:
            output.seek(0)
            return output
        
        # Reduce quality and try again
        quality -= 5
    
    # If we couldn't get it under target_size, return the smallest version
    output.seek(0)
    return output

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/get_stale_content', methods=['GET'])
def get_stale_content():
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
    
    if not force_refresh:
        cached_data = load_cache()
        if cached_data:
            return jsonify(cached_data)
    
    logging.info("Fetching stale content...")
    overseerr_requests = fetch_overseerr_requests()
    requester_mapping = create_requester_mapping(overseerr_requests)
    radarr_movies = fetch_radarr_movies()
    sonarr_series = fetch_sonarr_series()
    
    stale_content = fetch_plex_content(requester_mapping, radarr_movies, sonarr_series)
    
    data_with_timestamp = {
        'timestamp': datetime.now().isoformat(),
        'content': stale_content
    }
    
    save_cache(data_with_timestamp)
    
    return jsonify(data_with_timestamp)

@app.route('/upload_to_cloudinary', methods=['POST'])
def upload_to_cloudinary():
    try:
        selected_content = request.json.get('selectedContent', [])
        
        if not selected_content:
            return jsonify({"error": "No content selected"}), 400

        updated_content = []
        current_date = datetime.now()
        folder_name = f"staleflix/{current_date.strftime('%Y-%m')}"

        for item in selected_content:
            try:
                response = requests.get(item['poster_url'])
                response.raise_for_status()
                
                # Process the image
                processed_image = process_image(response.content)
                
                result = cloudinary.uploader.upload(
                    processed_image,
                    folder=folder_name,
                    public_id=f"{item['title'].replace(' ', '_')}_{item['plex_id']}",
                    format='jpg'  # Ensure JPEG format
                )
                item['poster_url'] = result['secure_url']
                updated_content.append(item)
                logging.info(f"Successfully uploaded processed image for {item['title']} to Cloudinary in folder {folder_name}")
            except Exception as e:
                logging.error(f"Error processing and uploading image for {item['title']} to Cloudinary: {str(e)}")
                # If upload fails, keep the original Plex URL
                updated_content.append(item)

        return jsonify(updated_content), 200

    except Exception as e:
        logging.error(f"Error in Cloudinary upload process: {str(e)}")
        return jsonify({"error": "An unexpected error occurred during Cloudinary upload"}), 500

@app.route('/api/send-to-listmonk', methods=['POST'])
def send_to_listmonk():
    try:
        data = request.json
        current_month_year = get_current_month_year()
        subject = f"StaleFlix Newsletter - {current_month_year}"
        html_content = data['htmlContent']

        campaign_data = {
            "name": subject,
            "subject": subject,
            "lists": [int(LISTMONK_LIST_ID)],
            "from_email": LISTMONK_FROM_EMAIL,
            "type": "regular",
            "content_type": "html",
            "body": html_content
        }

        auth = get_listmonk_auth()
        logging.info(f"Sending campaign to Listmonk: {subject}")
        logging.debug(f"Campaign data: {json.dumps(campaign_data, indent=2)}")

        response = requests.post(
            f"{LISTMONK_API_URL}/campaigns",
            json=campaign_data,
            auth=auth
        )
        response.raise_for_status()
        campaign_id = response.json()['data']['id']
        logging.info(f"Campaign created successfully. ID: {campaign_id}")

        start_response = requests.put(
            f"{LISTMONK_API_URL}/campaigns/{campaign_id}/status",
            json={"status": "running"},
            auth=auth
        )
        start_response.raise_for_status()
        logging.info("Campaign started successfully")

        return jsonify({"message": "Newsletter sent to Listmonk successfully"}), 200
    except requests.RequestException as e:
        logging.error(f"Error sending newsletter to Listmonk: {str(e)}")
        if e.response:
            logging.error(f"Response status code: {e.response.status_code}")
            logging.error(f"Response headers: {e.response.headers}")
            logging.error(f"Response content: {e.response.text}")
        return jsonify({"error": f"Failed to send newsletter to Listmonk: {str(e)}"}), 500

@app.route('/api/test-listmonk-connection', methods=['GET'])
def test_listmonk_connection():
    try:
        auth = get_listmonk_auth()
        logging.info(f"Testing Listmonk connection")
        response = requests.get(
            f"{LISTMONK_API_URL}/health",
            auth=auth
        )
        response.raise_for_status()
        logging.info(f"Listmonk health check response: {response.text}")
        return jsonify({"message": "Listmonk connection successful", "status": response.json()}), 200
    except requests.RequestException as e:
        logging.error(f"Error connecting to Listmonk: {str(e)}")
        if e.response:
            logging.error(f"Response status code: {e.response.status_code}")
            logging.error(f"Response headers: {e.response.headers}")
            logging.error(f"Response content: {e.response.text}")
        return jsonify({"error": f"Failed to connect to Listmonk: {str(e)}"}), 500

def get_plex_server():
    return PlexServer(PLEX_URL, PLEX_TOKEN)

def create_or_get_collection(plex, library_type):
    collection_name = f"{'Movies' if library_type == 'movie' else 'TV Shows'} leaving Plex next month"
    try:
        collection = plex.library.section('Movies' if library_type == 'movie' else 'TV Shows').collection(collection_name)
    except:
        collection = plex.library.section('Movies' if library_type == 'movie' else 'TV Shows').createCollection(collection_name)
    return collection

@app.route('/api/send-to-plex-collections', methods=['POST'])
def send_to_plex_collections():
    try:
        selected_content = request.json.get('selectedContent', [])
        
        if not selected_content:
            return jsonify({"error": "No content selected"}), 400

        plex = get_plex_server()
        
        movies_collection = create_or_get_collection(plex, 'movie')
        tv_shows_collection = create_or_get_collection(plex, 'show')

        for item in selected_content:
            if item['type'] == 'anime':
                continue  # Skip anime content

            try:
                plex_item = plex.fetchItem(int(item['plex_id']))
                if item['type'] == 'movie':
                    movies_collection.addItems(plex_item)
                elif item['type'] == 'show':
                    tv_shows_collection.addItems(plex_item)
            except Exception as e:
                logging.error(f"Error adding item {item['title']} to Plex collection: {str(e)}")

        return jsonify({"message": "Content successfully added to Plex collections"}), 200

    except Exception as e:
        logging.error(f"Error in send_to_plex_collections: {str(e)}")
        return jsonify({"error": "An unexpected error occurred while sending content to Plex collections"}), 500

# Ensure logs directory exists
if not os.path.exists('logs'):
    os.makedirs('logs')

# Set up logging
logging.basicConfig(
    filename='logs/staleflix.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

if __name__ == '__main__':
    app.run(debug=True, port=9999, host='0.0.0.0')

