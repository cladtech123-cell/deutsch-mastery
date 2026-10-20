"""Course content tables. PKs are the stable text ids from content/*.json (PROJECT_PLAN §4, D4)."""
from typing import Any

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

OWNER_KINDS = ("lesson", "final", "module_test", "grammar", "placement", "exam", "reading")


class Level(Base):
    __tablename__ = "levels"
    code: Mapped[str] = mapped_column(String(2), primary_key=True)
    title: Mapped[str] = mapped_column(String(100))
    order: Mapped[int] = mapped_column(Integer)


class Module(Base):
    __tablename__ = "modules"
    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    level: Mapped[str] = mapped_column(ForeignKey("levels.code"))
    number: Mapped[int] = mapped_column(Integer, unique=True)
    title: Mapped[str] = mapped_column(String(200))
    title_de: Mapped[str] = mapped_column(String(200))
    goals: Mapped[list[Any]]
    writing_task: Mapped[dict[str, Any] | None]
    version: Mapped[int] = mapped_column(Integer)
    content_hash: Mapped[str] = mapped_column(String(64))


class Lesson(Base):
    __tablename__ = "lessons"
    __table_args__ = (UniqueConstraint("module_id", "order"),)
    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    module_id: Mapped[str] = mapped_column(ForeignKey("modules.id"))
    order: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    title_de: Mapped[str] = mapped_column(String(200))
    goal: Mapped[str] = mapped_column(Text)
    skill_focus: Mapped[list[Any]]
    sections: Mapped[dict[str, Any]]
    version: Mapped[int] = mapped_column(Integer)
    content_hash: Mapped[str] = mapped_column(String(64))


class VocabularyItem(Base):
    __tablename__ = "vocabulary_items"
    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    de: Mapped[str] = mapped_column(String(200))
    uz: Mapped[str] = mapped_column(String(300))
    pos: Mapped[str] = mapped_column(String(20))
    article: Mapped[str | None] = mapped_column(String(3))
    plural: Mapped[str | None] = mapped_column(String(200))
    forms: Mapped[dict[str, Any] | None]
    example_de: Mapped[str] = mapped_column(Text)
    example_uz: Mapped[str] = mapped_column(Text)
    level: Mapped[str] = mapped_column(String(2), index=True)
    topic: Mapped[str] = mapped_column(String(40), index=True)
    first_lesson_id: Mapped[str | None] = mapped_column(ForeignKey("lessons.id"))


class LessonVocabulary(Base):
    __tablename__ = "lesson_vocabulary"
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), primary_key=True)
    vocab_id: Mapped[str] = mapped_column(ForeignKey("vocabulary_items.id"), primary_key=True)
    is_review: Mapped[bool] = mapped_column(Boolean, default=False)


class GrammarTopic(Base):
    __tablename__ = "grammar_topics"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    level: Mapped[str] = mapped_column(String(2))
    order: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))
    prerequisites: Mapped[list[Any]]
    next: Mapped[list[Any]]
    body: Mapped[dict[str, Any]]
    version: Mapped[int] = mapped_column(Integer)


class LessonGrammar(Base):
    __tablename__ = "lesson_grammar"
    lesson_id: Mapped[str] = mapped_column(ForeignKey("lessons.id"), primary_key=True)
    # no FK: topic ids are a closed list (GRAMMAR_IDS) and lessons may be seeded before content/grammar/ exists
    topic_id: Mapped[str] = mapped_column(String(40), primary_key=True)


class Exercise(Base):
    __tablename__ = "exercises"
    __table_args__ = (
        CheckConstraint(f"owner_kind in {OWNER_KINDS}", name="owner_kind"),
        CheckConstraint("difficulty between 1 and 3", name="difficulty"),
        Index("ix_exercises_owner", "owner_kind", "owner_id"),
    )
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    version: Mapped[int] = mapped_column(Integer)
    retired: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    level: Mapped[str] = mapped_column(String(2))
    module_id: Mapped[str | None] = mapped_column(ForeignKey("modules.id"))
    lesson_id: Mapped[str | None] = mapped_column(ForeignKey("lessons.id"))
    owner_kind: Mapped[str] = mapped_column(String(20))
    owner_id: Mapped[str] = mapped_column(String(60))
    section: Mapped[str | None] = mapped_column(String(200))
    skill: Mapped[str] = mapped_column(String(20))
    topic: Mapped[str] = mapped_column(String(40), index=True)
    grammar_topic: Mapped[str | None] = mapped_column(String(40))
    difficulty: Mapped[int] = mapped_column(Integer)
    question_type: Mapped[str] = mapped_column(String(30))
    question: Mapped[str] = mapped_column(Text)
    prompt_de: Mapped[str | None] = mapped_column(Text)
    options: Mapped[list[Any] | None]
    pairs: Mapped[list[Any] | None]
    correct_answer: Mapped[Any | None]
    accepted_answers: Mapped[list[Any]]
    criteria: Mapped[dict[str, Any] | None]
    hint: Mapped[str | None] = mapped_column(Text)
    explanation: Mapped[str] = mapped_column(Text)
    error_type: Mapped[str] = mapped_column(String(20))
    points: Mapped[int] = mapped_column(Integer)
    audio_text: Mapped[str | None] = mapped_column(Text)
    order: Mapped[int] = mapped_column(Integer)


class ReadingText(Base):
    __tablename__ = "reading_texts"
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    level: Mapped[str] = mapped_column(String(2))
    title: Mapped[str] = mapped_column(String(200))
    title_uz: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    glossary: Mapped[dict[str, Any]]
    version: Mapped[int] = mapped_column(Integer)


class Exam(Base):
    __tablename__ = "exams"
    __table_args__ = (CheckConstraint("kind in ('placement','midterm','module_test','level_exam')", name="kind"),)
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    kind: Mapped[str] = mapped_column(String(20))
    level: Mapped[str] = mapped_column(String(2))
    title: Mapped[str] = mapped_column(String(200))
    pass_percent: Mapped[int] = mapped_column(Integer)
    # [{skill, title, exercise_ids}] — keeps section order/skill from the content file
    sections: Mapped[list[Any]]


class WritingTask(Base):
    __tablename__ = "writing_tasks"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    module_id: Mapped[str] = mapped_column(ForeignKey("modules.id"))
    level: Mapped[str] = mapped_column(String(2))
    title: Mapped[str] = mapped_column(String(200))
    task_uz: Mapped[str] = mapped_column(Text)
    required_words: Mapped[list[Any]]
    min_words: Mapped[int] = mapped_column(Integer)
    max_words: Mapped[int] = mapped_column(Integer)
    criteria: Mapped[list[Any]]
    sample_answer: Mapped[str] = mapped_column(Text)
