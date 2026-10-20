# Build context is the repo root (see docker-compose.yml) so the image carries content/ for seeding.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    CONTENT_DIR=/app/content \
    TTS_MODEL=/app/tts/de_DE-thorsten-medium.onnx \
    TTS_CACHE_DIR=/tmp/tts-cache

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# German voice for server-side TTS: Piper "thorsten" (CC0), pinned to the v1.0.0 tag and checked by SHA-256.
RUN python - <<'PY'
import hashlib, os, urllib.request
base = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/de/de_DE/thorsten/medium/"
want = {
    "de_DE-thorsten-medium.onnx": "7e64762d8e5118bb578f2eea6207e1a35a8e0c30595010b666f983fc87bb7819",
    "de_DE-thorsten-medium.onnx.json": "974adee790533adb273a1ac88f49027d2a1b8f0f2cf4905954a4791e79264e85",
}
os.makedirs("/app/tts", exist_ok=True)
for name, sha in want.items():
    data = urllib.request.urlopen(base + name, timeout=300).read()
    got = hashlib.sha256(data).hexdigest()
    if got != sha:
        raise SystemExit(f"{name}: sha256 {got} != {sha}")
    with open(f"/app/tts/{name}", "wb") as f:
        f.write(data)
print("piper voice ok")
PY

RUN useradd --create-home --uid 10001 app
COPY backend/ /app/
COPY content/ /app/content/
RUN chmod +x /app/entrypoint.sh && chown -R app:app /app
USER app

EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]
