# ─── Stage 1: Front-end build ────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy just what’s needed for npm install + build
COPY package.json package-lock.json tsconfig.json webpack.config.js ./
COPY static/js ./static/js
COPY static/css ./static/css

RUN npm ci --no-audit --progress=false \
 && npm run build

# ─── Stage 2: Python deps build ─────────────────────────────────
FROM python:3-alpine AS python-builder
WORKDIR /app

# Install C build-tools for some Python wheels
RUN apk add --no-cache gcc musl-dev libffi-dev

# Copy & install requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ─── Stage 3: Final runtime image ──────────────────────────────
FROM python:3-alpine AS runtime
WORKDIR /app

# Bring in just the Python packages
COPY --from=python-builder /install /usr/local

# Copy Python app code & Jinja templates
COPY app.py ./
COPY templates ./templates

# Copy the built front-end bundle
COPY --from=frontend-builder /app/static/js/bundle.js ./static/js/bundle.js

# (Optional) copy static assets if you serve them directly
COPY --from=frontend-builder /app/static/css ./static/css

# Expose your Flask port
EXPOSE 9999

# Launch
CMD ["python", "app.py"]