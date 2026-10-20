from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Exercise, Lesson, Module


def levels_up_to(level: str) -> list[str]:
    return ["A1"] if level == "A1" else ["A1", "A2"]


async def owner_exercises(session: AsyncSession, kind: str, owner_id: str) -> Sequence[Exercise]:
    return (await session.scalars(
        select(Exercise).where(Exercise.owner_kind == kind, Exercise.owner_id == owner_id,
                               Exercise.retired.is_(False)).order_by(Exercise.order)
    )).all()


async def lessons_in_order(session: AsyncSession) -> Sequence[tuple[Lesson, Module]]:
    return (await session.execute(
        select(Lesson, Module).join(Module, Lesson.module_id == Module.id).order_by(Module.number, Lesson.order)
    )).tuples().all()
