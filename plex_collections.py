from plexapi.server import PlexServer
from plexapi.exceptions import NotFound, Unauthorized
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Plex server details
PLEX_URL = os.getenv('PLEX_URL', 'http://localhost:32400')
PLEX_TOKEN = os.getenv('PLEX_TOKEN')

def connect_to_plex():
    print(f"Attempting to connect to Plex server at {PLEX_URL}")
    if not PLEX_TOKEN:
        print("Error: PLEX_TOKEN is not set in the .env file.")
        return None
    try:
        server = PlexServer(PLEX_URL, PLEX_TOKEN)
        print("Successfully connected to Plex server")
        return server
    except Unauthorized:
        print("Failed to connect: Unauthorized. Please check your Plex token in the .env file.")
        return None
    except Exception as e:
        print(f"Failed to connect to Plex server: {e}")
        print("Please check your Plex server settings and try again.")
        return None

def get_all_collections(plex):
    collections = {}
    for section in plex.library.sections():
        if section.TYPE in ('movie', 'show'):
            section_collections = section.collections()
            collections[section.title] = [
                {
                    'title': collection.title,
                    'item_count': len(collection.items()),
                    'type': section.TYPE,
                    'key': collection.key
                }
                for collection in section_collections
            ]
    return collections

def print_collections(collections):
    for section, section_collections in collections.items():
        print(f"\n{section} Collections:")
        if not section_collections:
            print("  No collections found.")
        else:
            for i, collection in enumerate(section_collections, 1):
                print(f"  {i}. {collection['title']} ({collection['item_count']} items)")

def select_collection(collections):
    flat_collections = [coll for section in collections.values() for coll in section]
    while True:
        try:
            choice = int(input("Enter the number of the collection you want to manage: ")) - 1
            if 0 <= choice < len(flat_collections):
                return flat_collections[choice]
            else:
                print("Invalid choice. Please try again.")
        except ValueError:
            print("Please enter a valid number.")

def search_items(plex, item_type):
    search_term = input(f"Enter a search term for {item_type}s to add: ")
    if item_type == 'movie':
        return plex.library.section('Movies').search(search_term)
    elif item_type == 'show':
        return plex.library.section('TV Shows').search(search_term)

def add_items_to_collection(plex, collection, item_type):
    items = search_items(plex, item_type)
    if not items:
        print("No items found matching your search term.")
        return

    print("\nFound items:")
    for i, item in enumerate(items, 1):
        print(f"{i}. {item.title}")

    while True:
        try:
            choice = int(input("Enter the number of the item to add (0 to finish): ")) - 1
            if choice == -1:
                break
            if 0 <= choice < len(items):
                collection.addItems(items[choice])
                print(f"Added '{items[choice].title}' to the collection.")
            else:
                print("Invalid choice. Please try again.")
        except ValueError:
            print("Please enter a valid number.")

def main():
    plex = connect_to_plex()
    if not plex:
        return

    all_collections = get_all_collections(plex)
    print_collections(all_collections)

    selected_collection = select_collection(all_collections)
    print(f"\nSelected collection: {selected_collection['title']}")

    collection = plex.fetchItem(selected_collection['key'])
    add_items_to_collection(plex, collection, selected_collection['type'])

    print(f"\nUpdated collection: {collection.title} ({len(collection.items())} items)")

if __name__ == "__main__":
    main()