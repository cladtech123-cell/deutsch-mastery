"""User vocabulary + SM-2 review queue (cards live in review_cards)."""
from datetime import UTC, datetime, time

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ReviewCard, ReviewLog, User, VocabularyItem
from app.repositories import users as users_repo
from app.repositories.progress import bump_daily, today
from app.schemas.content import VocabList, VocabOut, VocabUser
from app.schemas.progress import ReviewCardOut, ReviewQueue, ReviewQueueCard
from app.services import srs


def _vocab_out(v: VocabularyItem, card: ReviewCard | None) -> VocabOut:
    out = VocabOut.model_validate(v)
    if card is not None:
        out.user = VocabUser(saved=card.saved, state=card.state, due_at=card.due_at,
                             correct_count=card.correct_count, wrong_count=card.wrong_count)
    return out


def is_weak():
    return and_(ReviewCard.wrong_count > 0,
                or_(ReviewCard.wrong_count >= ReviewCard.correct_count, ReviewCard.lapses >= 2))


async def list_vocab(session: AsyncSession, user: User, q: str | None, topic: str | None, level: str | None,
                     saved: bool | None, weak: bool | None, limit: int) -> VocabList:
    stmt = select(VocabularyItem, ReviewCard).outerjoin(
        ReviewCard, and_(ReviewCard.vocab_id == VocabularyItem.id, ReviewCard.user_id == user.id))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(VocabularyItem.de.ilike(like), VocabularyItem.uz.ilike(like)))
    if topic:
        stmt = stmt.where(VocabularyItem.topic == topic)
    if level:
        stmt = stmt.where(VocabularyItem.level == level)
    if saved is not None:
        stmt = stmt.where(ReviewCard.saved.is_(True)) if saved else stmt.where(
            or_(ReviewCard.id.is_(None), ReviewCard.saved.is_(False)))
    if weak:
        stmt = stmt.where(is_weak())
    rows = (await session.execute(stmt.order_by(VocabularyItem.level, VocabularyItem.de).limit(limit))).tuples().all()
    topics = (await session.scalars(select(VocabularyItem.topic).distinct().order_by(VocabularyItem.topic))).all()
    return VocabList(items=[_vocab_out(v, c) for v, c in rows], topics=list(topics))


async def set_saved(session: AsyncSession, user: User, vocab_id: str, saved: bool) -> VocabOut:
    vocab = await session.get(VocabularyItem, vocab_id)
    if vocab is None:
        raise HTTPException(404, "So'z topilmadi.")
    card = await session.scalar(select(ReviewCard).where(ReviewCard.user_id == user.id,
                                                         ReviewCard.vocab_id == vocab_id))
    if card is None and saved:
        card = ReviewCard(user_id=user.id, vocab_id=vocab_id, saved=True, source="manual", state="new",
                          due_at=datetime.now(UTC), ease=2.5, interval_days=0, repetitions=0, correct_count=0,
                          wrong_count=0, lapses=0)
        session.add(card)
    elif card is not None:
        card.saved = saved  # un-saving keeps the card and its SRS history
    await session.commit()
    return _vocab_out(vocab, card)


async def _reviewed_today(session: AsyncSession, user: User) -> tuple[int, int]:
    """(new cards introduced today, reviews of already-learned cards today). A new card has interval 0."""
    start = datetime.combine(today(), time.min, tzinfo=UTC)
    new, reviews = (await session.execute(
        select(func.count().filter(ReviewLog.prev_interval == 0), func.count().filter(ReviewLog.prev_interval > 0))
        .where(ReviewLog.user_id == user.id, ReviewLog.created_at >= start))).one()
    return new, reviews


async def due_counts(session: AsyncSession, user: User) -> tuple[int, int, int]:
    """(due learned cards within today's cap, new cards still allowed today, due_total)."""
    settings = await users_repo.get_settings(session, user.id)
    new_done, reviews_done = await _reviewed_today(session, user)
    now = datetime.now(UTC)
    due = await session.scalar(select(func.count()).where(
        ReviewCard.user_id == user.id, ReviewCard.state != "new", ReviewCard.due_at <= now)) or 0
    new_avail = await session.scalar(select(func.count()).where(
        ReviewCard.user_id == user.id, ReviewCard.state == "new")) or 0
    due_capped = min(due, max(0, srs.REVIEWS_PER_DAY - reviews_done))
    new_left = max(0, settings.new_per_day - new_done)
    return due_capped, new_left, due_capped + min(new_avail, new_left)


async def queue(session: AsyncSession, user: User, limit: int) -> ReviewQueue:
    due_capped, new_left, due_total = await due_counts(session, user)
    now = datetime.now(UTC)
    base = select(ReviewCard, VocabularyItem).join(VocabularyItem).where(ReviewCard.user_id == user.id)
    due_rows = (await session.execute(
        base.where(ReviewCard.state != "new", ReviewCard.due_at <= now)
        .order_by(ReviewCard.due_at, ReviewCard.lapses.desc()).limit(min(limit, due_capped)))).tuples().all()
    room = min(limit - len(due_rows), new_left)
    new_rows = (await session.execute(
        base.where(ReviewCard.state == "new").order_by(ReviewCard.created_at, ReviewCard.id)
        .limit(max(0, room)))).tuples().all() if room > 0 else []
    cards = [ReviewQueueCard(card_id=c.id, vocab=_vocab_out(v, c), state=c.state,
                             direction="uz_de" if c.repetitions % 2 else "de_uz")
             for c, v in [*due_rows, *new_rows]]
    return ReviewQueue(cards=cards, due_total=due_total, new_today_left=new_left)


async def answer(session: AsyncSession, user: User, card_id: int, quality: int) -> ReviewCardOut:
    card = await session.scalar(select(ReviewCard).where(ReviewCard.id == card_id, ReviewCard.user_id == user.id))
    if card is None:
        raise HTTPException(404, "Kartochka topilmadi.")
    prev = card.interval_days
    nxt = srs.sm2(srs.CardState(card.ease, card.interval_days, card.repetitions, card.lapses), quality)
    now = datetime.now(UTC)
    card.ease, card.interval_days, card.repetitions, card.lapses = nxt.ease, nxt.interval_days, nxt.repetitions, \
        nxt.lapses
    card.state = srs.state_for(nxt.interval_days)
    card.due_at = srs.due_at(now, nxt.interval_days)
    card.last_reviewed_at = now
    if quality >= 3:
        card.correct_count += 1
    else:
        card.wrong_count += 1
    session.add(ReviewLog(card_id=card.id, user_id=user.id, quality=quality, prev_interval=prev,
                          new_interval=nxt.interval_days))
    await bump_daily(session, user.id, 1, int(quality >= 3))
    await session.commit()
    return ReviewCardOut.model_validate(card)
