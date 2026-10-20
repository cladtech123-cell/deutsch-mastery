"""Placement test, module tests, midterms and level exams."""
from collections.abc import Sequence

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Exam, ExamAttempt, Exercise, PlacementResult, User
from app.schemas.content import (
    ExamDetail, ExamResult, ExamSectionOut, ExamSummary, PlacementResultOut,
)
from app.services import placement
from app.services.exercises import grade_set, percent, to_out

CONTEXT = {"placement": "placement", "module_test": "module_test", "midterm": "exam", "level_exam": "exam"}


async def _exam_exercises(session: AsyncSession, exam: Exam) -> dict[str, Exercise]:
    ids = [i for s in exam.sections for i in s["exercise_ids"]]
    rows = (await session.scalars(select(Exercise).where(Exercise.id.in_(ids), Exercise.retired.is_(False)))).all()
    return {e.id: e for e in rows}


async def _get(session: AsyncSession, exam_id: str) -> Exam:
    exam = await session.get(Exam, exam_id)
    if exam is None:
        raise HTTPException(404, "Test topilmadi.")
    return exam


async def list_exams(session: AsyncSession, user: User) -> list[ExamSummary]:
    stats = {eid: (best, n) for eid, best, n in (await session.execute(
        select(ExamAttempt.exam_id, func.max(ExamAttempt.percent), func.count())
        .where(ExamAttempt.user_id == user.id).group_by(ExamAttempt.exam_id))).all()}
    order = {"placement": 0, "module_test": 1, "midterm": 2, "level_exam": 3}
    exams = sorted((await session.scalars(select(Exam))).all(), key=lambda e: (e.level, order[e.kind], e.id))
    return [ExamSummary(id=e.id, kind=e.kind, level=e.level, title=e.title, pass_percent=e.pass_percent,
                        question_count=sum(len(s["exercise_ids"]) for s in e.sections),
                        best_percent=stats.get(e.id, (None, 0))[0], attempts=stats.get(e.id, (None, 0))[1])
            for e in exams]


async def detail(session: AsyncSession, exam_id: str) -> ExamDetail:
    exam = await _get(session, exam_id)
    exs = await _exam_exercises(session, exam)
    return ExamDetail(
        id=exam.id, kind=exam.kind, level=exam.level, title=exam.title, pass_percent=exam.pass_percent,
        sections=[ExamSectionOut(skill=s["skill"], title=s["title"],
                                 exercises=[to_out(exs[i]) for i in s["exercise_ids"] if i in exs])
                  for s in exam.sections])


async def _grade_exam(session: AsyncSession, user: User, exam: Exam, answers: dict):
    exs = await _exam_exercises(session, exam)
    ordered: Sequence[Exercise] = [exs[i] for s in exam.sections for i in s["exercise_ids"] if i in exs]
    if not ordered:
        raise HTTPException(404, "Testda savollar yo'q.")
    attempt = ExamAttempt(user_id=user.id, exam_id=exam.id, score=0, total=0, percent=0, passed=False, by_skill={})
    session.add(attempt)
    await session.flush()
    score, total, results, by_skill = await grade_set(session, user, ordered, answers, CONTEXT[exam.kind], attempt.id)
    attempt.score, attempt.total, attempt.percent = score, total, percent(score, total)
    attempt.passed, attempt.by_skill = attempt.percent >= exam.pass_percent, by_skill
    return attempt, results


async def submit(session: AsyncSession, user: User, exam_id: str, answers: dict) -> ExamResult:
    exam = await _get(session, exam_id)
    attempt, results = await _grade_exam(session, user, exam, answers)
    await session.commit()
    return ExamResult(score=attempt.score, total=attempt.total, percent=attempt.percent, passed=attempt.passed,
                      by_skill=attempt.by_skill, results=results)


async def placement_exam(session: AsyncSession) -> ExamDetail:
    exam = await session.scalar(select(Exam).where(Exam.kind == "placement").order_by(Exam.id).limit(1))
    if exam is None:
        raise HTTPException(404, "Diagnostik test hali yuklanmagan.")
    return await detail(session, exam.id)


async def placement_submit(session: AsyncSession, user: User, answers: dict) -> PlacementResultOut:
    exam = await session.scalar(select(Exam).where(Exam.kind == "placement").order_by(Exam.id).limit(1))
    if exam is None:
        raise HTTPException(404, "Diagnostik test hali yuklanmagan.")
    attempt, _ = await _grade_exam(session, user, exam, answers)
    level, module = placement.recommend(attempt.percent)
    session.add(PlacementResult(user_id=user.id, score_by_skill=attempt.by_skill, percent=attempt.percent,
                                recommended_level=level, recommended_module=module))
    await session.commit()
    return PlacementResultOut(score_by_skill=attempt.by_skill, percent=attempt.percent,
                              recommended_level=level, recommended_module=module)
