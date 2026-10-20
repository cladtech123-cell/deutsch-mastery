"""Writing rubric checks (deterministic) + optional AI feedback."""
import re

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, WritingSubmission, WritingTask
from app.schemas.content import CheckItem
from app.schemas.progress import WritingOut, WritingTaskOut
from app.services.ai.providers import AIProvider
from app.services.ai.tutor import writing_feedback
from app.repositories.progress import bump_daily
from app.services.grading import Check, words


def rubric(text: str, min_words: int, max_words: int, required: list[str]) -> list[Check]:
    n = len(words(text))
    checks = [Check("length", min_words <= n <= max_words,
                    f"So'zlar soni: {n} (tavsiya: {min_words}–{max_words}).")]
    present = set(words(text))
    missing = [w for w in required if not all(p in present for p in words(w))]
    checks.append(Check("required_words", not missing,
                        "Barcha kerakli so'zlar ishlatilgan." if not missing
                        else "Ishlatilmagan so'zlar: " + ", ".join(missing)))
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]
    lower_start = [s for s in sentences if s[0].isalpha() and not s[0].isupper()]
    checks.append(Check("capitalization", not lower_start,
                        "Gaplar katta harf bilan boshlangan." if not lower_start
                        else f"{len(lower_start)} ta gap kichik harf bilan boshlangan."))
    ends = text.strip()[-1:] in ".!?"
    checks.append(Check("punctuation", ends, "Matn tinish belgisi bilan tugagan." if ends
                        else "Matn oxiriga nuqta, so'roq yoki undov belgisi qo'ying."))
    return checks


def _out(sub: WritingSubmission, sample: str | None = None) -> WritingOut:
    return WritingOut(id=sub.id, task_id=sub.task_id, text=sub.text, word_count=sub.word_count,
                      checks=[CheckItem(**c) for c in sub.checks], ai_feedback=sub.ai_feedback,
                      sample_answer=sample, created_at=sub.created_at)


async def tasks(session: AsyncSession) -> list[WritingTaskOut]:
    rows = (await session.scalars(select(WritingTask).order_by(WritingTask.level, WritingTask.module_id))).all()
    return [WritingTaskOut.model_validate(t) for t in rows]


async def submit(session: AsyncSession, user: User, provider: AIProvider, task_id: str, text: str) -> WritingOut:
    task = await session.get(WritingTask, task_id)
    if task is None:
        raise HTTPException(404, "Yozma topshiriq topilmadi.")
    checks = rubric(text, task.min_words, task.max_words, task.required_words)
    ai = await writing_feedback(session, user, provider, task.task_uz, text)
    sub = WritingSubmission(user_id=user.id, task_id=task.id, text=text, word_count=len(words(text)),
                            checks=[c.__dict__ for c in checks], ai_feedback=ai)
    session.add(sub)
    await bump_daily(session, user.id, 1, int(all(c.ok for c in checks)))  # counts toward streak/weekly activity
    await session.commit()
    await session.refresh(sub)
    return _out(sub, task.sample_answer)


async def submissions(session: AsyncSession, user: User) -> list[WritingOut]:
    rows = (await session.execute(
        select(WritingSubmission, WritingTask.sample_answer).join(WritingTask)
        .where(WritingSubmission.user_id == user.id).order_by(WritingSubmission.created_at.desc()))).tuples().all()
    return [_out(s, sample) for s, sample in rows]
