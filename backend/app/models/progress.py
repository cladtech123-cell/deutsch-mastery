"""Per-user learning state. Every table hangs off users.id with ON DELETE CASCADE (DELETE /users/me)."""
import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, Date, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, created_at

def user_fk() -> ForeignKey:
    return ForeignKey("users.id", ondelete="CASCADE")


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(user_fk(), index=True)
    exam_id: Mapped[str] = mapped_column(ForeignKey("exams.id"))
    score: Mapped[int] = mapped_column(Integer)
    total: Mapped[int] = mapped_column(Integer)
    percent: Mapped[int] = mapped_column(Integer)
    passed: Mapped[bool] = mapped_column(Boolean)
    by_skill: Mapped[dict[str, Any]]
    created_at: Mapped[datetime] = created_at()


class ExerciseAttempt(Base):
    __tablename__ = "exercise_attempts"
    __table_args__ = (
        CheckConstraint(
            "context in ('lesson','final','module_test','exam','placement','grammar','reading','practice')",
            name="context"),
        Index("ix_exercise_attempts_user_created", "user_id", "created_at"),
        Index("ix_exercise_attempts_user_exercise", "user_id", "exercise_id"),
    )
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(user_fk())
    exercise_id: Mapped[str] = mapped_column(ForeignKey("exercises.id"))
    exercise_version: Mapped[int] = mapped_column(Integer)
    exam_attempt_id: Mapped[int | None] = mapped_column(ForeignKey("exam_attempts.id", ondelete="CASCADE"))
    context: Mapped[str] = mapped_column(String(20))
    skill: Mapped[str] = mapped_column(String(20))
    topic: Mapped[str] = mapped_column(String(40))
    grammar_topic: Mapped[str | None] = mapped_column(String(40))
    answer: Mapped[Any | None]
    is_correct: Mapped[bool] = mapped_column(Boolean)
    points: Mapped[int] = mapped_column(Integer)
    error_type: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime] = created_at()


class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    __table_args__ = (CheckConstraint("status in ('started','completed')", name="status"),)
    user_id: Mapped[uuid.UUID] = mapped_column(user_fk(), primary_key=True)
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), primary_key=True)
    status: Mapped[str] = mapped_column(String(10), default="started")
    best_score: Mapped[int | None] = mapped_column(Integer)
    last_score: Mapped[int | None] = mapped_column(Integer)
    attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    started_at: Mapped[datetime] = created_at()
    completed_at: Mapped[datetime | None]
    last_attempt_at: Mapped[datetime | None]


class ReviewCard(Base):
    __tablename__ = "review_cards"
    __table_args__ = (
        UniqueConstraint("user_id", "vocab_id"),
        CheckConstraint("state in ('new','learning','review','mastered')", name="state"),
        CheckConstraint("source in ('lesson','manual')", name="source"),
        Index("ix_review_cards_user_due", "user_id", "due_at"),
    )
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(user_fk())
    vocab_id: Mapped[str] = mapped_column(ForeignKey("vocabulary_items.id"))
    saved: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    ease: Mapped[float] = mapped_column(Float, default=2.5, server_default="2.5")
    interval_days: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    repetitions: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    due_at: Mapped[datetime]
    last_reviewed_at: Mapped[datetime | None]
    correct_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    wrong_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    lapses: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    state: Mapped[str] = mapped_column(String(10), default="new", server_default="new")
    source: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = created_at()


class ReviewLog(Base):
    __tablename__ = "review_logs"
    __table_args__ = (
        CheckConstraint("quality between 0 and 5", name="quality"),
        Index("ix_review_logs_user_created", "user_id", "created_at"),
    )
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    card_id: Mapped[int] = mapped_column(ForeignKey("review_cards.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(user_fk())
    quality: Mapped[int] = mapped_column(Integer)
    prev_interval: Mapped[int] = mapped_column(Integer)
    new_interval: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = created_at()


class PlacementResult(Base):
    __tablename__ = "placement_results"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(user_fk(), index=True)
    score_by_skill: Mapped[dict[str, Any]]
    percent: Mapped[int] = mapped_column(Integer)
    recommended_level: Mapped[str] = mapped_column(String(2))
    recommended_module: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = created_at()


class WritingSubmission(Base):
    __tablename__ = "writing_submissions"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(user_fk(), index=True)
    task_id: Mapped[str] = mapped_column(ForeignKey("writing_tasks.id"))
    text: Mapped[str] = mapped_column(Text)
    word_count: Mapped[int] = mapped_column(Integer)
    checks: Mapped[list[Any]]
    ai_feedback: Mapped[dict[str, Any] | None]
    created_at: Mapped[datetime] = created_at()


class SpeakingAttempt(Base):
    __tablename__ = "speaking_attempts"
    __table_args__ = (CheckConstraint("self_rating between 1 and 5", name="self_rating"),)
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(user_fk(), index=True)
    exercise_id: Mapped[str | None] = mapped_column(ForeignKey("exercises.id"))
    target_text: Mapped[str] = mapped_column(Text)
    recognized_text: Mapped[str | None] = mapped_column(Text)
    similarity: Mapped[float | None] = mapped_column(Float)
    self_rating: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = created_at()


class DailyActivity(Base):
    __tablename__ = "daily_activity"
    user_id: Mapped[uuid.UUID] = mapped_column(user_fk(), primary_key=True)
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    exercises_done: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    correct: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    minutes: Mapped[int] = mapped_column(Integer, default=0, server_default="0")


class AITutorMessage(Base):
    __tablename__ = "ai_tutor_messages"
    __table_args__ = (
        CheckConstraint("role in ('user','assistant')", name="role"),
        Index("ix_ai_tutor_messages_user_created", "user_id", "created_at"),
    )
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(user_fk())
    session_id: Mapped[uuid.UUID]
    role: Mapped[str] = mapped_column(String(10))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = created_at()
