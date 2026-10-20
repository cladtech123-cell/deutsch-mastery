from typing import Literal

from fastapi import APIRouter, Query

from app.core.security import CurrentUser, Session
from app.schemas.content import VocabList, VocabOut
from app.schemas.progress import ReviewAnswerIn, ReviewCardOut, ReviewQueue
from app.services import vocabulary

router = APIRouter(tags=["vocabulary"])


@router.get("/vocabulary", response_model=VocabList)
async def list_vocab(user: CurrentUser, session: Session, q: str | None = Query(None, max_length=100),
                     topic: str | None = None, level: Literal["A1", "A2"] | None = None,
                     saved: bool | None = None, weak: bool | None = None,
                     limit: int = Query(500, ge=1, le=2000)):
    return await vocabulary.list_vocab(session, user, q, topic, level, saved, weak, limit)


@router.post("/vocabulary/{vocab_id}/save", response_model=VocabOut)
async def save(vocab_id: str, user: CurrentUser, session: Session):
    return await vocabulary.set_saved(session, user, vocab_id, True)


@router.delete("/vocabulary/{vocab_id}/save", response_model=VocabOut)
async def unsave(vocab_id: str, user: CurrentUser, session: Session):
    return await vocabulary.set_saved(session, user, vocab_id, False)


@router.get("/review/queue", response_model=ReviewQueue, tags=["review"])
async def review_queue(user: CurrentUser, session: Session, limit: int = Query(20, ge=1, le=100)):
    return await vocabulary.queue(session, user, limit)


@router.post("/review/{card_id}/answer", response_model=ReviewCardOut, tags=["review"])
async def review_answer(card_id: int, body: ReviewAnswerIn, user: CurrentUser, session: Session):
    return await vocabulary.answer(session, user, card_id, body.quality)
