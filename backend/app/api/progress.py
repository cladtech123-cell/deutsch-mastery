from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.security import CurrentUser, Session
from app.schemas.progress import (
    AIStatus, Dashboard, SpeakingIn, SpeakingOut, Stats, TutorIn, TutorOut, WritingIn, WritingOut, WritingTaskOut,
)
from app.services import progress, speaking, writing
from app.services.ai import tutor
from app.services.ai.providers import AIProvider, get_provider

router = APIRouter()
Provider = Annotated[AIProvider, Depends(get_provider)]


@router.get("/progress/dashboard", response_model=Dashboard, tags=["progress"])
async def dashboard(user: CurrentUser, session: Session):
    return await progress.dashboard(session, user)


@router.get("/progress/stats", response_model=Stats, tags=["progress"])
async def stats(user: CurrentUser, session: Session):
    return await progress.stats(session, user)


@router.get("/writing/tasks", response_model=list[WritingTaskOut], tags=["writing"])
async def writing_tasks(user: CurrentUser, session: Session):
    return await writing.tasks(session)


@router.post("/writing/submissions", response_model=WritingOut, status_code=201, tags=["writing"])
async def writing_submit(body: WritingIn, user: CurrentUser, session: Session, provider: Provider):
    return await writing.submit(session, user, provider, body.task_id, body.text)


@router.get("/writing/submissions", response_model=list[WritingOut], tags=["writing"])
async def writing_list(user: CurrentUser, session: Session):
    return await writing.submissions(session, user)


@router.post("/speaking/attempts", response_model=SpeakingOut, status_code=201, tags=["speaking"])
async def speaking_attempt(body: SpeakingIn, user: CurrentUser, session: Session):
    return await speaking.record(session, user, body)


@router.get("/ai/status", response_model=AIStatus, tags=["ai"])
async def ai_status(user: CurrentUser, provider: Provider):
    return AIStatus(configured=provider.configured, provider=settings.AI_PROVIDER)


@router.post("/ai/tutor", response_model=TutorOut, tags=["ai"])
async def ai_tutor(body: TutorIn, user: CurrentUser, session: Session, provider: Provider):
    return await tutor.tutor(session, user, provider, body.message, body.session_id)
