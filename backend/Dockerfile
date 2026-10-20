# Build context is the repo root (see docker-compose.yml) so the image carries content/ for seeding.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    CONTENT_DIR=/app/content

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

RUN useradd --create-home --uid 10001 app
COPY backend/ /app/
COPY content/ /app/content/
RUN chmod +x /app/entrypoint.sh && chown -R app:app /app
USER app

EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]
