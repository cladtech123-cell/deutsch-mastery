"""Exercise serialization (keys stripped), checking and attempt recording."""
import random
from collections import defaultdict
from collections.abc import Sequence
from typing import Any

from fastapi import HTTPException
from sqlalchemy import exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Exercise, ExerciseAttempt, User
from app.repositories import users as users_repo
from app.repositories.content import levels_up_to
from app.repositories.progress import bump_daily
from app.schemas.content import CheckItem, CheckOut, CriteriaOut, ExerciseOut
from app.services import grading

CHECKABLE = ("lesson", "grammar", "reading")


def to_out(ex: Exercise) -> ExerciseOut:
    options, left, right = ex.options, None, None
    if ex.question_type == "order_words" and options:
        options = random.sample(options, len(options))
    if ex.question_type == "match" and ex.pairs:
        left = random.sample([p[0] for p in ex.pairs], len(ex.pairs))
        right = random.sample([p[1] for p in ex.pairs], len(ex.pairs))
    crit = CriteriaOut(min_words=ex.criteria["min_words"], required_words=ex.criteria.get("required_words", [])) \
        if ex.criteria else None
    # shortcut: browser TTS needs audio_text, so a dictation's answer reaches the client (also in graded tests);
    # serve server-generated audio instead if tests ever need to be cheat-proof
    return ExerciseOut(
        id=ex.id, version=ex.version, type=ex.question_type, skill=ex.skill, topic=ex.topic,
        grammar_topic=ex.grammar_topic, difficulty=ex.difficulty, question=ex.question, prompt_de=ex.prompt_de,
        options=options, left=left, right=right, hint=ex.hint, audio_text=ex.audio_text, criteria=crit,
        points=ex.points,
    )


def _shown_answer(ex: Exercise) -> Any:
    return ex.criteria.get("sample") if ex.question_type in grading.OPEN_TYPES and ex.criteria else ex.correct_answer


async def grade_and_record(session: AsyncSession, user: User, ex: Exercise, answer: Any, context: str,
                           exam_attempt_id: int | None = None) -> CheckOut:
    g = grading.grade(ex.question_type, ex.correct_answer, ex.accepted_answers or [], ex.criteria, answer)
    session.add(ExerciseAttempt(
        user_id=user.id, exercise_id=ex.id, exercise_version=ex.version, exam_attempt_id=exam_attempt_id,
        context=context, skill=ex.skill, topic=ex.topic, grammar_topic=ex.grammar_topic, answer=answer,
        is_correct=g.correct, points=ex.points if g.correct else 0, error_type=None if g.correct else ex.error_type,
    ))
    return CheckOut(
        exercise_id=ex.id, correct=g.correct, correct_answer=_shown_answer(ex), explanation=ex.explanation,
        hint=ex.hint, error_type=None if g.correct else ex.error_type, warning=g.warning,
        points=ex.points if g.correct else 0,
        checks=[CheckItem(name=c.name, ok=c.ok, message=c.message) for c in g.checks] or None,
    )


def _not_solved(user: User):
    return ~exists().where(ExerciseAttempt.user_id == user.id, ExerciseAttempt.exercise_id == Exercise.id,
                           ExerciseAttempt.is_correct.is_(True))


async def retry_for(session: AsyncSession, user: User, ex: Exercise) -> Exercise | None:
    """Another unsolved practice exercise on the same grammar_topic (else topic), preferring the same skill,
    then the same error type, so a missed listening item is retried with listening, not vocabulary."""
    level = (await users_repo.get_settings(session, user.id)).current_level
    same = Exercise.grammar_topic == ex.grammar_topic if ex.grammar_topic else Exercise.topic == ex.topic
    return await session.scalar(
        select(Exercise).where(same, Exercise.id != ex.id, Exercise.owner_kind.in_(CHECKABLE),
                               Exercise.retired.is_(False), Exercise.level.in_(levels_up_to(level)),
                               _not_solved(user))
        .order_by((Exercise.skill == ex.skill).desc(), (Exercise.error_type == ex.error_type).desc(), func.random())
        .limit(1)
    )


async def check_single(session: AsyncSession, user: User, exercise_id: str, answer: Any) -> CheckOut:
    ex = await session.get(Exercise, exercise_id)
    if ex is None:
        raise HTTPException(404, "Mashq topilmadi.")
    if ex.owner_kind not in CHECKABLE:
        raise HTTPException(409, "Bu savol test ichida tekshiriladi.")
    seen_before = await session.scalar(select(exists().where(
        ExerciseAttempt.user_id == user.id, ExerciseAttempt.exercise_id == ex.id)))
    out = await grade_and_record(session, user, ex, answer, "practice" if seen_before else ex.owner_kind)
    if not out.correct:
        retry = await retry_for(session, user, ex)
        out.retry_exercise = to_out(retry) if retry else None
    await bump_daily(session, user.id, 1, int(out.correct))
    await session.commit()
    return out


async def grade_set(session: AsyncSession, user: User, exercises: Sequence[Exercise], answers: dict[str, Any],
                    context: str, exam_attempt_id: int | None = None) -> tuple[int, int, list[CheckOut], dict]:
    """Grade a whole test. Unanswered = wrong. `speak` is self-assessed, so it never counts toward the score."""
    score = total = 0
    results: list[CheckOut] = []
    by_skill: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    for ex in exercises:
        r = await grade_and_record(session, user, ex, answers.get(ex.id), context, exam_attempt_id)
        results.append(r)
        if ex.question_type == "speak":
            continue
        score += r.points
        total += ex.points
        by_skill[ex.skill][0] += r.points
        by_skill[ex.skill][1] += ex.points
    await bump_daily(session, user.id, len(results), sum(r.correct for r in results))
    return score, total, results, {k: round(100 * s / t) for k, (s, t) in by_skill.items() if t}


def percent(score: int, total: int) -> int:
    return round(100 * score / total) if total else 0
