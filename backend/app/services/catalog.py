"""Grammar center and reading texts (read-only content)."""
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Exercise, GrammarTopic, ReadingText
from app.repositories.content import owner_exercises
from app.schemas.content import GrammarDetail, GrammarSummary, ReadingDetail, ReadingSummary
from app.services.exercises import to_out


def _summary(g: GrammarTopic) -> dict:
    return dict(id=g.id, level=g.level, order=g.order, title=g.title, prerequisites=g.prerequisites, next=g.next)


async def grammar_list(session: AsyncSession) -> list[GrammarSummary]:
    rows = (await session.scalars(select(GrammarTopic).order_by(GrammarTopic.level, GrammarTopic.order))).all()
    return [GrammarSummary(**_summary(g)) for g in rows]


async def grammar_detail(session: AsyncSession, topic_id: str) -> GrammarDetail:
    g = await session.get(GrammarTopic, topic_id)
    if g is None:
        raise HTTPException(404, "Grammatika mavzusi topilmadi.")
    b = g.body
    return GrammarDetail(**_summary(g), rule=b["rule"], when=b["when"], structure=b["structure"],
                         explanation=b.get("explanation", []), examples=b["examples"],
                         common_mistakes=b["common_mistakes"],
                         exercises=[to_out(e) for e in await owner_exercises(session, "grammar", g.id)])


async def reading_list(session: AsyncSession) -> list[ReadingSummary]:
    counts = dict((await session.execute(
        select(Exercise.owner_id, func.count()).where(Exercise.owner_kind == "reading", Exercise.retired.is_(False))
        .group_by(Exercise.owner_id))).tuples().all())
    rows = (await session.scalars(select(ReadingText).order_by(ReadingText.level, ReadingText.id))).all()
    return [ReadingSummary(id=r.id, level=r.level, title=r.title, title_uz=r.title_uz,
                           question_count=counts.get(r.id, 0)) for r in rows]


async def reading_detail(session: AsyncSession, text_id: str) -> ReadingDetail:
    r = await session.get(ReadingText, text_id)
    if r is None:
        raise HTTPException(404, "Matn topilmadi.")
    return ReadingDetail(id=r.id, version=r.version, level=r.level, title=r.title, title_uz=r.title_uz, body=r.body,
                         glossary=r.glossary,
                         questions=[to_out(e) for e in await owner_exercises(session, "reading", r.id)])
