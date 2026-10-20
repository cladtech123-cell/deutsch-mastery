import uuid
from datetime import UTC, date, datetime

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DailyActivity


def today() -> date:
    # all days are UTC (PROJECT_PLAN §4: timestamptz UTC)
    return datetime.now(UTC).date()


async def bump_daily(session: AsyncSession, user_id: uuid.UUID, done: int, correct: int) -> None:
    stmt = insert(DailyActivity).values(user_id=user_id, day=today(), exercises_done=done, correct=correct)
    await session.execute(stmt.on_conflict_do_update(
        index_elements=["user_id", "day"],
        set_={"exercises_done": DailyActivity.exercises_done + stmt.excluded.exercises_done,
              "correct": DailyActivity.correct + stmt.excluded.correct},
    ))
