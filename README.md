# StaleFlix

StaleFlix is a self‑hosted web application that helps you locate and act on **stale** (unwatched or barely watched) items in your Plex library. It interrogates Plex and companion services (Overseerr, Radarr, Sonarr) to build a list, then lets you:

* Review the items in a sortable table
* Upload resized poster art to Cloudinary (for lighter emails)
* Generate an inlined HTML newsletter with custom intro and dispatch it via Listmonk
* Tag the selected titles in dedicated Plex collections for subsequent clean‑up

---

## How it works

| Layer     | Tech                   | What it does                                                                                                                                                                                                                                                                                                                        |
| --------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Back‑end  | **Flask** (`app.py`)   | Talks to Plex, Overseerr, Radarr and Sonarr APIs; determines staleness; pushes artwork to Cloudinary; sends campaigns to Listmonk; and caches the last run. ([app.py](https://github.com/BattermanZ/StaleFlix/blob/main/app.py))                                                                                                    |
| Front‑end | **React + TypeScript** | Single‑page interface served by Flask; fetches `/get_stale_content`; displays the table/wizard; and calls the upload & send endpoints. ([App.tsx](https://github.com/BattermanZ/StaleFlix/blob/main/static/js/App.tsx), [generateNewsletter.ts](https://github.com/BattermanZ/StaleFlix/blob/main/static/js/generateNewsletter.ts)) |
| Styling   | **Custom CSS**         | Palette and minor Bootstrap overrides. ([custom.css](https://github.com/BattermanZ/StaleFlix/blob/main/static/css/custom.css))                                                                                                                                                                                                      |

---

## Configuration

Copy the sample file and populate your secrets:

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

---

## Running with Docker

A multi‑stage `Dockerfile` is provided. Build and run:

```bash
docker build -t staleflix:latest .
docker run -d --name staleflix --env-file .env -p 9999:9999 staleflix:latest
```

The container exposes the Flask app on **port 9999**.

([Dockerfile](https://github.com/BattermanZ/StaleFlix/blob/main/Dockerfile))

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
