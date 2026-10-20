"""Server-side German speech (Piper, offline neural TTS) for browsers that have no de-DE Web Speech voice.

The voice model is baked into the Docker image (backend/Dockerfile). Without it the service reports
unavailable and the frontend falls back to its honest "no audio" notice.
"""
import asyncio
import hashlib
import io
import threading
import wave
from functools import lru_cache

from fastapi import HTTPException

from app.core.config import settings

_lock = threading.Lock()  # one synthesis at a time: CPU-bound, and keeps memory flat


def available() -> bool:
    return settings.TTS_MODEL.is_file() and settings.TTS_MODEL.with_suffix(".onnx.json").is_file()


@lru_cache(maxsize=1)
def _voice():
    from piper import PiperVoice  # imported lazily: the package is only needed where the model exists

    return PiperVoice.load(str(settings.TTS_MODEL))


def _synthesize(text: str, rate: float) -> bytes:
    from piper import SynthesisConfig

    buf = io.BytesIO()
    with _lock, wave.open(buf, "wb") as wav:
        # length_scale > 1 speaks slower: a learner's "0.75x" means 1/0.75 longer
        _voice().synthesize_wav(text, wav, syn_config=SynthesisConfig(length_scale=1 / rate))
    return buf.getvalue()


async def speech(text: str, rate: float) -> bytes:
    """WAV bytes for `text`; cached on disk by content so a sentence is synthesized once."""
    if not available():
        raise HTTPException(503, "Serverda nemischa ovoz o'rnatilmagan. Matnni o'qib mashq qiling.")
    key = hashlib.sha256(f"{settings.TTS_MODEL.name}|{rate:.2f}|{text}".encode()).hexdigest()
    cached = settings.TTS_CACHE_DIR / f"{key}.wav"
    if cached.is_file():
        return cached.read_bytes()
    audio = await asyncio.to_thread(_synthesize, text, rate)
    try:
        settings.TTS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        tmp = cached.with_suffix(".tmp")
        tmp.write_bytes(audio)
        tmp.replace(cached)  # atomic: concurrent readers never see a half-written file
    except OSError:
        pass  # cache is an optimisation; serving the audio matters more
    return audio
