from typing import Literal

from fastapi import APIRouter, Query

from app.core.security import CurrentUser, Session
from app.schemas.content import (
    AnswersIn, CheckIn, CheckOut, Curriculum, ExerciseList, LessonOut, ListeningList, TestResult,
)
from app.services import exercises, lessons

router = APIRouter(tags=["curriculum"])


@router.get("/curriculum", response_model=Curriculum)
async def curriculum(user: CurrentUser, session: Session):
    return await lessons.curriculum(session, user)


@router.get("/lessons/{lesson_id}", response_model=LessonOut)
async def get_lesson(lesson_id: str, user: CurrentUser, session: Session):
    return await lessons.get_lesson(session, user, lesson_id)


@router.post("/lessons/{lesson_id}/final", response_model=TestResult)
async def lesson_final(lesson_id: str, body: AnswersIn, user: CurrentUser, session: Session):
    return await lessons.submit_final(session, user, lesson_id, body.answers)


@router.post("/exercises/{exercise_id}/check", response_model=CheckOut, tags=["exercises"])
async def check(exercise_id: str, body: CheckIn, user: CurrentUser, session: Session):
    return await exercises.check_single(session, user, exercise_id, body.answer)


@router.get("/practice", response_model=ExerciseList, tags=["exercises"])
async def practice(user: CurrentUser, session: Session,
                   mode: Literal["mistakes", "topic", "skill"] = "mistakes", topic: str | None = None,
                   skill: str | None = None, limit: int = Query(10, ge=1, le=50)):
    return await lessons.practice(session, user, mode, topic, skill, limit)


@router.get("/listening", response_model=ListeningList, tags=["skills"])
async def listening(user: CurrentUser, session: Session):
    return await lessons.listening(session)
