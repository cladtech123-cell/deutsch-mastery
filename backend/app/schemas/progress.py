import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.content import CheckItem, VocabOut


class ReviewQueueCard(BaseModel):
    card_id: int
    vocab: VocabOut
    direction: Literal["de_uz", "uz_de"]
    state: str


class ReviewQueue(BaseModel):
    cards: list[ReviewQueueCard]
    due_total: int
    new_today_left: int


class ReviewAnswerIn(BaseModel):
    quality: int = Field(ge=0, le=5)


class ReviewCardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    vocab_id: str
    saved: bool
    ease: float
    interval_days: int
    repetitions: int
    due_at: datetime
    last_reviewed_at: datetime | None
    correct_count: int
    wrong_count: int
    lapses: int
    state: str
    source: str


class WritingTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    module_id: str
    level: str
    title: str
    task_uz: str
    required_words: list[str]
    min_words: int
    max_words: int
    criteria: list[str]


class WritingIn(BaseModel):
    task_id: str = Field(max_length=40)
    text: str = Field(min_length=1, max_length=5000)


class WritingOut(BaseModel):
    id: int
    task_id: str
    text: str
    word_count: int
    checks: list[CheckItem]
    ai_feedback: dict | None
    sample_answer: str | None = None
    created_at: datetime


class SpeakingIn(BaseModel):
    exercise_id: str | None = Field(default=None, max_length=60)
    target_text: str = Field(min_length=1, max_length=500)
    recognized_text: str | None = Field(default=None, max_length=1000)
    self_rating: int | None = Field(default=None, ge=1, le=5)


class DiffWord(BaseModel):
    word: str
    ok: bool


class SpeakingOut(BaseModel):
    id: int
    similarity: int | None  # 0..100
    diff: list[DiffWord]


class IdTitle(BaseModel):
    id: str
    title: str


class Recommendation(BaseModel):
    kind: Literal["lesson", "grammar", "review", "exam"]
    id: str
    title: str
    reason: str


class RecentResult(BaseModel):
    kind: str
    title: str
    percent: int
    created_at: datetime


class DayActivity(BaseModel):
    day: date
    exercises: int
    correct: int


class WeakTopic(BaseModel):
    topic: str
    accuracy: int
    attempts: int


class WeeklyGoal(BaseModel):
    target_days: int
    done_days: int


class Dashboard(BaseModel):
    level: str
    course_percent: int
    lessons_completed: int
    lessons_total: int
    today_lesson: IdTitle | None
    due_reviews: int
    next_recommendation: Recommendation | None
    recent_results: list[RecentResult]
    skills: dict[str, int | None]
    streak: int
    weekly_activity: list[DayActivity]
    words_learned: int
    weak_topics: list[WeakTopic]
    weekly_goal: WeeklyGoal


class SkillStat(BaseModel):
    accuracy: int | None
    attempts: int
    correct: int


class TopicStat(BaseModel):
    topic: str
    accuracy: int
    attempts: int
    correct: int


class ExamStat(BaseModel):
    exam_id: str
    title: str
    best_percent: int
    attempts: int


class Stats(BaseModel):
    skills: dict[str, SkillStat]
    topics: list[TopicStat]
    vocabulary: dict[str, int]
    exams: list[ExamStat]
    lessons_completed: int
    lessons_total: int
    total_attempts: int


class AIStatus(BaseModel):
    configured: bool
    provider: str


class TutorIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: uuid.UUID | None = None


class TutorOut(BaseModel):
    session_id: uuid.UUID
    reply: str
