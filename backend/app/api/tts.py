from typing import Annotated

from fastapi import APIRouter, Query, Response

from app.core import ratelimit
from app.core.config import settings
from app.core.security import CurrentUser
from app.services import tts

router = APIRouter(tags=["tts"])


@router.get("/tts/status")
async def tts_status(user: CurrentUser) -> dict[str, bool]:
    return {"available": tts.available()}


@router.get("/tts", response_class=Response, responses={200: {"content": {"audio/wav": {}}}})
async def speak(
    user: CurrentUser,
    text: Annotated[str, Query(min_length=1, max_length=400)],
    rate: Annotated[float, Query(ge=0.5, le=1.5)] = 1.0,
) -> Response:
    ratelimit.hit(f"tts:{user.id}", settings.TTS_RATE_PER_MINUTE)
    audio = await tts.speech(text.strip(), round(rate, 2))
    # same text + rate always gives the same audio, so the browser may keep it
    return Response(audio, media_type="audio/wav", headers={"Cache-Control": "private, max-age=31536000, immutable"})
