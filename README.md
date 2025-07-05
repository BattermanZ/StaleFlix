# StaleFlix

StaleFlix is a self‑hosted web application that helps you locate and act on **stale** (unwatched or barely watched) items in your Plex library. It interrogates Plex and companion services (Overseerr, Radarr, Sonarr) to build a list, then lets you:

* Review the items in a sortable table
* Upload resized poster art to Cloudinary (for lighter emails)
* Generate an inlined HTML newsletter and dispatch it via Listmonk
* Tag the selected titles in dedicated Plex collections for subsequent clean‑up

**Disclaimer:** This is an early-stage project developed entirely with the assistance of generative AI; functionality and stability is probably pretty wonky. As is, this app does not delete any media so your library should be safe.

---

## Required companion applications and services

The following external applications and services are required to run StaleFlix:

* **Plex Media Server**: for your media library and playback statistics
* **Overseerr**: to retrieve requester information
* **Radarr**: to fetch movie file sizes
* **Sonarr**: to fetch TV show file sizes
* **Cloudinary**: for hosting  poster images
* **Listmonk**: for generating and dispatching newsletters

---

## How it works

| Layer     | Tech                   | What it does                                                                                                                                                                                                                                                                                                                        |
| --------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Back‑end  | **Flask** (`app.py`)   | Talks to Plex, Overseerr, Radarr and Sonarr APIs; determines staleness; pushes artwork to Cloudinary; sends campaigns to Listmonk; and caches the last run. ([app.py](https://github.com/BattermanZ/StaleFlix/blob/main/app.py))                                                                                                    |
| Front‑end | **React + TypeScript** | Single‑page interface served by Flask; fetches `/get_stale_content`; displays the table/wizard; and calls the upload & send endpoints. ([App.tsx](https://github.com/BattermanZ/StaleFlix/blob/main/static/js/App.tsx), [generateNewsletter.ts](https://github.com/BattermanZ/StaleFlix/blob/main/static/js/generateNewsletter.ts)) |
| Styling   | **Custom CSS**         | Palette and minor Bootstrap overrides. ([custom.css](https://github.com/BattermanZ/StaleFlix/blob/main/static/css/custom.css))                                                                                                                                                                                                      |

---

## Configuration

Copy the sample file at the root of your project folder and populate your secrets:

```bash
cp .env.example .env
```

Key variables (see the template for the full list):

* `PLEX_URL`, `PLEX_TOKEN` – access to your Plex server
* `OVERSEERR_API_URL`, `OVERSEERR_API_KEY` – requester information
* `RADARR_API_URL`, `RADARR_API_KEY` & `SONARR_API_URL`, `SONARR_API_KEY` – on‑disk sizes
* `CLOUDINARY_*` – poster uploads
* `LISTMONK_*` – newsletter delivery
* `STALE_MONTHS` – age threshold (default `6`)

([.env.example](https://github.com/BattermanZ/StaleFlix/blob/main/.env.example))

**For info**: The app is not very efficient when scanning, it takes it 3-4 minutes for a 4TB library on my N100. So be patient.

---

## Running with Docker

An official image is available on Docker Hub and can be deployed with the provided Docker Compose file ([docker-compose.yml](https://github.com/BattermanZ/StaleFlix/blob/main/docker-compose.yml)):

```bash
docker compose up -d
```

This command will pull the `battermanz/staleflix:latest` image (or any version you specify in `docker-compose.yml`) and launch the service on port 9999. To run a specific tag, adjust the image field in `docker-compose.yml` or override it:

```bash
docker compose pull
daocker compose up -d
```

Alternatively, you may run the container directly:

```bash
docker run -d --name staleflix \
  -e TZ=Etc/UTC \
  --env-file .env:ro \
  -p 9999:9999 \
  battermanz/staleflix:latest
```

---

## Manual development setup (optional)

```bash
# Back‑end
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Front‑end
npm ci
npm run build   # produces static/js/bundle.js
python app.py   # http://localhost:9999
```

---

## Licence

This project is distributed under the **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)**. See the `LICENSE` file for the full text.
