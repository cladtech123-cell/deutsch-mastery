from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import case, exists, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Exercise, ExerciseAttempt, Lesson, LessonProgress, LessonVocabulary, Level, Module, ReviewCard, User,
    VocabularyItem,
)
from app.repositories import users as users_repo
from app.repositories.content import lessons_in_order, levels_up_to, owner_exercises
from app.schemas.content import (
    Curriculum, CurriculumLesson, CurriculumLevel, CurriculumModule, ExerciseList, LessonOut, LessonProgressOut,
    ListeningItem, ListeningList, TestResult, VocabOut,
)
from app.services.exercises import CHECKABLE, grade_set, percent, to_out

PASS_PERCENT = 70


async def curriculum(session: AsyncSession, user: User) -> Curriculum:
    progress = {p.lesson_id: p for p in (await session.scalars(
        select(LessonProgress).where(LessonProgress.user_id == user.id))).all()}
    levels = (await session.scalars(select(Level).order_by(Level.order))).all()
    modules = (await session.scalars(select(Module).order_by(Module.number))).all()
    lessons = (await session.scalars(select(Lesson).order_by(Lesson.order))).all()
    out = []
    for lv in levels:
        mods = []
        for m in (m for m in modules if m.level == lv.code):
            ls = [CurriculumLesson(id=l.id, order=l.order, title=l.title,
                                   status=progress[l.id].status if l.id in progress else None,
                                   best_score=progress[l.id].best_score if l.id in progress else None)
                  for l in lessons if l.module_id == m.id]
            done = sum(1 for l in ls if l.status == "completed")
            mods.append(CurriculumModule(id=m.id, number=m.number, title=m.title, title_de=m.title_de,
                                         goals=m.goals, percent=round(100 * done / len(ls)) if ls else 0, lessons=ls))
        out.append(CurriculumLevel(code=lv.code, title=lv.title, modules=mods))
    return Curriculum(levels=out)


async def _lesson_vocab(session: AsyncSession, lesson_id: str, is_review: bool) -> list[VocabOut]:
    rows = (await session.scalars(
        select(VocabularyItem).join(LessonVocabulary, LessonVocabulary.vocab_id == VocabularyItem.id)
        .where(LessonVocabulary.lesson_id == lesson_id, LessonVocabulary.is_review.is_(is_review))
        .order_by(VocabularyItem.de))).all()
    return [VocabOut.model_validate(v) for v in rows]


async def get_lesson(session: AsyncSession, user: User, lesson_id: str) -> LessonOut:
    row = (await session.execute(select(Lesson, Module).join(Module).where(Lesson.id == lesson_id))).first()
    if row is None:
        raise HTTPException(404, "Dars topilmadi.")
    lesson, module = row
    await session.execute(insert(LessonProgress).values(user_id=user.id, lesson_id=lesson.id, status="started")
                          .on_conflict_do_nothing())
    await session.commit()
    progress = await session.get(LessonProgress, (user.id, lesson.id))
    s = lesson.sections
    return LessonOut(
        id=lesson.id, version=lesson.version, level=module.level, module=module.number, module_id=module.id,
        order=lesson.order, title=lesson.title, title_de=lesson.title_de, goal=lesson.goal,
        skill_focus=lesson.skill_focus, explanation=s["explanation"], grammar=s["grammar"],
        listening=s["listening"], situation=s["situation"],
        vocabulary=await _lesson_vocab(session, lesson.id, False),
        review_vocabulary=await _lesson_vocab(session, lesson.id, True),
        exercises=[to_out(e) for e in await owner_exercises(session, "lesson", lesson.id)],
        final_test=[to_out(e) for e in await owner_exercises(session, "final", lesson.id)],
        progress=LessonProgressOut.model_validate(progress) if progress else None,
    )


async def submit_final(session: AsyncSession, user: User, lesson_id: str, answers: dict) -> TestResult:
    lesson = await session.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(404, "Dars topilmadi.")
    exercises = await owner_exercises(session, "final", lesson_id)
    if not exercises:
        raise HTTPException(404, "Bu darsda yakuniy test yo'q.")
    score, total, results, _ = await grade_set(session, user, exercises, answers, "final")
    pct = percent(score, total)
    passed = pct >= PASS_PERCENT
    now = datetime.now(UTC)
    stmt = insert(LessonProgress).values(
        user_id=user.id, lesson_id=lesson_id, status="completed" if passed else "started", best_score=pct,
        last_score=pct, attempts=1, completed_at=now if passed else None, last_attempt_at=now)
    await session.execute(stmt.on_conflict_do_update(
        index_elements=["user_id", "lesson_id"],
        set_={
            # once completed, a later failed retake never un-completes the lesson
            "status": case((LessonProgress.status == "completed", "completed"), else_=stmt.excluded.status),
            "best_score": func.greatest(func.coalesce(LessonProgress.best_score, 0), stmt.excluded.best_score),
            "last_score": stmt.excluded.last_score,
            "attempts": LessonProgress.attempts + 1,
            "completed_at": func.coalesce(LessonProgress.completed_at, stmt.excluded.completed_at),
            "last_attempt_at": now,
        }))
    if passed:
        vocab_ids = (await session.scalars(select(LessonVocabulary.vocab_id).where(
            LessonVocabulary.lesson_id == lesson_id, LessonVocabulary.is_review.is_(False)))).all()
        if vocab_ids:
            await session.execute(insert(ReviewCard).values([
                {"user_id": user.id, "vocab_id": v, "due_at": now, "source": "lesson", "state": "new"}
                for v in vocab_ids]).on_conflict_do_nothing())
    await session.commit()
    return TestResult(score=score, total=total, percent=pct, passed=passed, results=results)


async def listening(session: AsyncSession) -> ListeningList:
    items = []
    for lesson, module in await lessons_in_order(session):
        lst = lesson.sections["listening"]
        qs = (await session.scalars(select(Exercise).where(Exercise.id.in_(lst["questions"]),
                                                           Exercise.retired.is_(False)))).all()
        items.append(ListeningItem(lesson_id=lesson.id, lesson_title=lesson.title, level=module.level,
                                   title=lst["title"], lines=lst["lines"], questions=[to_out(q) for q in qs]))
    return ListeningList(items=items)


async def practice(session: AsyncSession, user: User, mode: str, topic: str | None, skill: str | None,
                   limit: int) -> ExerciseList:
    level = (await users_repo.get_settings(session, user.id)).current_level
    q = select(Exercise).where(Exercise.owner_kind.in_(CHECKABLE), Exercise.retired.is_(False),
                               Exercise.level.in_(levels_up_to(level)))
    solved = exists().where(ExerciseAttempt.user_id == user.id, ExerciseAttempt.exercise_id == Exercise.id,
                            ExerciseAttempt.is_correct.is_(True))
    if mode == "mistakes":
        failed = exists().where(ExerciseAttempt.user_id == user.id, ExerciseAttempt.exercise_id == Exercise.id,
                                ExerciseAttempt.is_correct.is_(False))
        q = q.where(failed, ~solved)
    elif mode == "topic":
        if not topic:
            raise HTTPException(422, "Mavzu (topic) ko'rsatilmagan.")
        q = q.where(or_(Exercise.topic == topic, Exercise.grammar_topic == topic))
    else:
        if not skill:
            raise HTTPException(422, "Ko'nikma (skill) ko'rsatilmagan.")
        q = q.where(Exercise.skill == skill)
    # unsolved first, then random
    rows = (await session.scalars(q.order_by(solved, func.random()).limit(limit))).all()
    return ExerciseList(exercises=[to_out(e) for e in rows])
