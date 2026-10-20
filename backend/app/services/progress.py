"""Dashboard and stats, computed from attempts/progress tables (PROJECT_PLAN §6 "Hisoblash qoidalari")."""
from datetime import timedelta

from sqlalchemy import Integer, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content_schema import GRAMMAR_IDS
from app.models import (
    DailyActivity, Exam, ExamAttempt, Exercise, ExerciseAttempt, GrammarTopic, Lesson, LessonProgress, Module,
    PlacementResult, ReviewCard, User,
)
from app.repositories import users as users_repo
from app.repositories.content import lessons_in_order
from app.repositories.progress import today
from app.schemas.progress import (
    Dashboard, DayActivity, ExamStat, IdTitle, RecentResult, Recommendation, SkillStat, Stats, TopicStat,
    WeakTopic, WeeklyGoal,
)
from app.services.vocabulary import due_counts

SKILLS = ("vocabulary", "grammar", "reading", "listening", "writing", "speaking")
SKILL_WINDOW = 50
SKILL_MIN = 5
WEAK_ACCURACY = 60
WEAK_MIN_ATTEMPTS = 4


async def skill_percents(session: AsyncSession, user: User) -> dict[str, int | None]:
    ranked = select(ExerciseAttempt.skill, ExerciseAttempt.is_correct, func.row_number().over(
        partition_by=ExerciseAttempt.skill, order_by=ExerciseAttempt.created_at.desc()).label("rn")
    ).where(ExerciseAttempt.user_id == user.id).subquery()
    rows = (await session.execute(
        select(ranked.c.skill, func.count(), func.sum(cast(ranked.c.is_correct, Integer)))
        .where(ranked.c.rn <= SKILL_WINDOW).group_by(ranked.c.skill))).all()
    got = {s: (n, c) for s, n, c in rows}
    return {s: round(100 * got[s][1] / got[s][0]) if s in got and got[s][0] >= SKILL_MIN else None for s in SKILLS}


async def topic_stats(session: AsyncSession, user: User) -> list[TopicStat]:
    key = func.coalesce(ExerciseAttempt.grammar_topic, ExerciseAttempt.topic)
    rows = (await session.execute(
        select(key, func.count(), func.sum(cast(ExerciseAttempt.is_correct, Integer)))
        .where(ExerciseAttempt.user_id == user.id).group_by(key))).all()
    return sorted((TopicStat(topic=t, attempts=n, correct=c, accuracy=round(100 * c / n)) for t, n, c in rows),
                  key=lambda s: (s.accuracy, -s.attempts))


async def weak_topics(session: AsyncSession, user: User) -> list[WeakTopic]:
    return [WeakTopic(topic=t.topic, accuracy=t.accuracy, attempts=t.attempts)
            for t in await topic_stats(session, user)
            if t.accuracy < WEAK_ACCURACY and t.attempts >= WEAK_MIN_ATTEMPTS][:5]


async def _activity(session: AsyncSession, user: User) -> dict:
    rows = (await session.scalars(select(DailyActivity).where(
        DailyActivity.user_id == user.id, DailyActivity.day >= today() - timedelta(days=400)))).all()
    return {r.day: r for r in rows if r.exercises_done > 0}


def streak(active_days, today_) -> int:
    day = today_ if today_ in active_days else today_ - timedelta(days=1)
    n = 0
    while day in active_days:
        n += 1
        day -= timedelta(days=1)
    return n


async def _recommend(session: AsyncSession, user: User, weak: list[WeakTopic], due: int,
                     next_lesson: tuple[str, str] | None) -> Recommendation | None:
    if weak:
        topic = weak[0].topic
        if topic in GRAMMAR_IDS:
            g = await session.get(GrammarTopic, topic)
            if g:
                return Recommendation(kind="grammar", id=g.id, title=g.title,
                                      reason=f"\"{g.title}\" mavzusida to'g'ri javoblar {weak[0].accuracy}%.")
        col = Exercise.grammar_topic if topic in GRAMMAR_IDS else Exercise.topic
        lesson = await session.scalar(
            select(Lesson).join(Exercise, Exercise.lesson_id == Lesson.id).join(Module)
            .where(col == topic, Exercise.retired.is_(False)).order_by(Module.number, Lesson.order).limit(1))
        if lesson:
            return Recommendation(kind="lesson", id=lesson.id, title=lesson.title,
                                  reason=f"\"{topic}\" mavzusida xatolar ko'p ({weak[0].accuracy}%). Takrorlang.")
    if due > 0:
        return Recommendation(kind="review", id="queue", title="Lug'atni takrorlash",
                              reason=f"{due} ta kartochka takrorlashni kutmoqda.")
    if next_lesson:
        return Recommendation(kind="lesson", id=next_lesson[0], title=next_lesson[1], reason="Keyingi dars.")
    return None


async def dashboard(session: AsyncSession, user: User) -> Dashboard:
    settings = await users_repo.get_settings(session, user.id)
    lessons = await lessons_in_order(session)
    completed = set((await session.scalars(select(LessonProgress.lesson_id).where(
        LessonProgress.user_id == user.id, LessonProgress.status == "completed"))).all())
    todo = [(l.id, l.title) for l, m in lessons if l.id not in completed]
    todo_from_start = [(l.id, l.title) for l, m in lessons
                       if l.id not in completed and m.number >= settings.start_module]
    next_lesson = (todo_from_start or todo or [None])[0]
    _, _, due_total = await due_counts(session, user)
    weak = await weak_topics(session, user)

    recent: list[RecentResult] = []
    for lp, title in (await session.execute(
            select(LessonProgress, Lesson.title).join(Lesson).where(
                LessonProgress.user_id == user.id, LessonProgress.last_attempt_at.is_not(None))
            .order_by(LessonProgress.last_attempt_at.desc()).limit(5))).tuples():
        recent.append(RecentResult(kind="lesson", title=title, percent=lp.last_score or 0,
                                   created_at=lp.last_attempt_at))
    for ea, exam in (await session.execute(
            # placement attempts are reported once, from placement_results below
            select(ExamAttempt, Exam).join(Exam).where(ExamAttempt.user_id == user.id, Exam.kind != "placement")
            .order_by(ExamAttempt.created_at.desc()).limit(5))).tuples():
        recent.append(RecentResult(kind=exam.kind, title=exam.title, percent=ea.percent, created_at=ea.created_at))
    for pr in (await session.scalars(select(PlacementResult).where(PlacementResult.user_id == user.id)
                                     .order_by(PlacementResult.created_at.desc()).limit(5))):
        recent.append(RecentResult(kind="placement", title="Diagnostik test", percent=pr.percent,
                                   created_at=pr.created_at))
    recent = sorted(recent, key=lambda r: r.created_at, reverse=True)[:5]

    active = await _activity(session, user)
    t = today()
    week_start = t - timedelta(days=t.weekday())
    words = await session.scalar(select(func.count()).where(
        ReviewCard.user_id == user.id, ReviewCard.state.in_(("review", "mastered")))) or 0
    return Dashboard(
        level=settings.current_level,
        course_percent=round(100 * len(completed) / len(lessons)) if lessons else 0,
        lessons_completed=len(completed), lessons_total=len(lessons),
        today_lesson=IdTitle(id=next_lesson[0], title=next_lesson[1]) if next_lesson else None,
        due_reviews=due_total,
        next_recommendation=await _recommend(session, user, weak, due_total, next_lesson),
        recent_results=recent,
        skills=await skill_percents(session, user),
        streak=streak(active.keys(), t),
        weekly_activity=[DayActivity(day=d, exercises=active[d].exercises_done if d in active else 0,
                                     correct=active[d].correct if d in active else 0)
                         for d in (t - timedelta(days=i) for i in range(6, -1, -1))],
        words_learned=words,
        weak_topics=weak,
        weekly_goal=WeeklyGoal(target_days=settings.weekly_goal_days,
                               done_days=sum(1 for d in active if week_start <= d <= t)),
    )


async def stats(session: AsyncSession, user: User) -> Stats:
    rows = (await session.execute(
        select(ExerciseAttempt.skill, func.count(), func.sum(cast(ExerciseAttempt.is_correct, Integer)))
        .where(ExerciseAttempt.user_id == user.id).group_by(ExerciseAttempt.skill))).all()
    by_skill = {s: (n, c) for s, n, c in rows}
    recent = await skill_percents(session, user)
    states = dict((await session.execute(
        select(ReviewCard.state, func.count()).where(ReviewCard.user_id == user.id)
        .group_by(ReviewCard.state))).tuples().all())
    exams = (await session.execute(
        select(Exam.id, Exam.title, func.max(ExamAttempt.percent), func.count())
        .join(ExamAttempt, ExamAttempt.exam_id == Exam.id).where(ExamAttempt.user_id == user.id)
        .group_by(Exam.id, Exam.title).order_by(Exam.id))).all()
    lessons_total = await session.scalar(select(func.count()).select_from(Lesson)) or 0
    completed = await session.scalar(select(func.count()).where(
        LessonProgress.user_id == user.id, LessonProgress.status == "completed")) or 0
    return Stats(
        skills={s: SkillStat(accuracy=recent[s], attempts=by_skill.get(s, (0, 0))[0],
                             correct=by_skill.get(s, (0, 0))[1]) for s in SKILLS},
        topics=await topic_stats(session, user),
        vocabulary={st: states.get(st, 0) for st in ("new", "learning", "review", "mastered")},
        exams=[ExamStat(exam_id=i, title=t, best_percent=b, attempts=n) for i, t, b, n in exams],
        lessons_completed=completed, lessons_total=lessons_total,
        total_attempts=sum(n for n, _ in by_skill.values()),
    )
