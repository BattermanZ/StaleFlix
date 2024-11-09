from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fuzzywuzzy import fuzz
import logging
import json
import cloudinary
import cloudinary.uploader

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

# Ensure logs directory exists
if not os.path.exists('logs'):
    os.makedirs('logs')

# Set up logging
logging.basicConfig(filename='logs/staleflix.log', level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables
load_dotenv()

PLEX_URL = os.getenv('PLEX_URL')
PLEX_TOKEN = os.getenv('PLEX_TOKEN')
OVERSEERR_API_URL = os.getenv('OVERSEERR_API_URL')
OVERSEERR_API_KEY = os.getenv('OVERSEERR_API_KEY')
RADARR_API_URL = os.getenv('RADARR_API_URL')
RADARR_API_KEY = os.getenv('RADARR_API_KEY')
SONARR_API_URL = os.getenv('SONARR_API_URL')
SONARR_API_KEY = os.getenv('SONARR_API_KEY')
STALE_MONTHS = int(os.getenv('STALE_MONTHS', 3))
N8N_WEBHOOK_URL = os.getenv('N8N_WEBHOOK_URL')
API_KEY = os.getenv('N8N_API_KEY')

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

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
            library_title = directory.get('title')
            library_type = directory.get('type')

            if library_type in ['movie', 'show']:
                logging.info(f"Fetching content for library: {library_title} (Type: {library_type})")

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

def upload_to_cloudinary(plex_poster_url):
    try:
        response = requests.get(plex_poster_url)
        response.raise_for_status()
        result = cloudinary.uploader.upload(response.content)
        return result['secure_url']
    except Exception as e:
        logging.error(f"Error uploading to Cloudinary: {str(e)}")
        return None

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

@app.route('/push_to_n8n', methods=['POST'])
def push_to_n8n():
    try:
        headers = {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
        }
        
        selected_content = request.json.get('selected_content', [])
        
        if not selected_content:
            return jsonify({"error": "No content selected"}), 400

        total_space_saved = sum(float(item['size']) for item in selected_content if item['size'] != "Unknown")

        # Upload posters to Cloudinary
        for item in selected_content:
            cloudinary_url = upload_to_cloudinary(item['poster_url'])
            if cloudinary_url:
                item['poster_url'] = cloudinary_url
            else:
                logging.warning(f"Failed to upload poster for {item['title']} to Cloudinary. Using original Plex URL.")

        n8n_data = {
            "stale_content": selected_content,
            "total_space_saved": f"{total_space_saved:.2f}",
            "timestamp": datetime.now().isoformat()
        }

        response = requests.post(N8N_WEBHOOK_URL, json=n8n_data, headers=headers)
        response.raise_for_status()

        return jsonify({"message": "Data successfully pushed to n8n"}), 200
    except requests.RequestException as e:
        logging.error(f"Error pushing data to n8n: {str(e)}")
        return jsonify({"error": "Failed to push data to n8n"}), 500
    except Exception as e:
        logging.error(f"Unexpected error in push_to_n8n: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=9999, host='0.0.0.0')