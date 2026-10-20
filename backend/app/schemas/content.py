from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class CriteriaOut(BaseModel):
    min_words: int
    required_words: list[str]


class ExerciseOut(BaseModel):
    """Exercise without answer keys: no correct_answer, accepted_answers, explanation, pairs or criteria.sample."""
    id: str
    version: int
    type: str
    skill: str
    topic: str
    grammar_topic: str | None
    difficulty: int
    question: str
    prompt_de: str | None
    options: list[str] | None
    left: list[str] | None
    right: list[str] | None
    hint: str | None
    audio_text: str | None
    criteria: CriteriaOut | None
    points: int


class CheckItem(BaseModel):
    name: str
    ok: bool
    message: str


class CheckIn(BaseModel):
    answer: str | list[str] | dict[str, str] | None


class CheckOut(BaseModel):
    exercise_id: str
    correct: bool
    correct_answer: Any
    explanation: str
    hint: str | None
    error_type: str | None
    warning: str | None
    points: int
    checks: list[CheckItem] | None = None
    retry_exercise: ExerciseOut | None = None


class AnswersIn(BaseModel):
    answers: dict[str, str | list[str] | dict[str, str] | None] = Field(max_length=200)


class TestResult(BaseModel):
    score: int
    total: int
    percent: int
    passed: bool
    results: list[CheckOut]


class ExamResult(TestResult):
    by_skill: dict[str, int]


class VocabUser(BaseModel):
    saved: bool
    state: str
    due_at: datetime
    correct_count: int
    wrong_count: int


class VocabOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    de: str
    uz: str
    pos: str
    article: str | None
    plural: str | None
    forms: dict[str, str] | None
    example_de: str
    example_uz: str
    level: str
    topic: str
    first_lesson_id: str | None
    user: VocabUser | None = None


class VocabList(BaseModel):
    items: list[VocabOut]
    topics: list[str]


class LessonProgressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    status: str
    best_score: int | None
    last_score: int | None
    attempts: int


class LessonOut(BaseModel):
    id: str
    version: int
    level: str
    module: int
    module_id: str
    order: int
    title: str
    title_de: str
    goal: str
    skill_focus: list[str]
    explanation: list[dict[str, Any]]
    vocabulary: list[VocabOut]
    review_vocabulary: list[VocabOut]
    grammar: list[dict[str, Any]]
    listening: dict[str, Any]
    situation: dict[str, Any]
    exercises: list[ExerciseOut]
    final_test: list[ExerciseOut]
    progress: LessonProgressOut | None


class CurriculumLesson(BaseModel):
    id: str
    order: int
    title: str
    status: str | None
    best_score: int | None


class CurriculumModule(BaseModel):
    id: str
    number: int
    title: str
    title_de: str
    goals: list[str]
    percent: int
    lessons: list[CurriculumLesson]


class CurriculumLevel(BaseModel):
    code: str
    title: str
    modules: list[CurriculumModule]


class Curriculum(BaseModel):
    levels: list[CurriculumLevel]


class ExerciseList(BaseModel):
    exercises: list[ExerciseOut]


class ListeningItem(BaseModel):
    lesson_id: str
    lesson_title: str
    level: str
    title: str
    lines: list[dict[str, Any]]
    questions: list[ExerciseOut]


class ListeningList(BaseModel):
    items: list[ListeningItem]


class GrammarSummary(BaseModel):
    id: str
    level: str
    order: int
    title: str
    prerequisites: list[str]
    next: list[str]


class GrammarDetail(GrammarSummary):
    rule: str
    when: str
    structure: str
    explanation: list[dict[str, Any]]
    examples: list[dict[str, Any]]
    common_mistakes: list[dict[str, Any]]
    exercises: list[ExerciseOut]


class ExamSummary(BaseModel):
    id: str
    kind: str
    level: str
    title: str
    pass_percent: int
    question_count: int
    best_percent: int | None
    attempts: int


class ExamSectionOut(BaseModel):
    skill: str
    title: str
    exercises: list[ExerciseOut]


class ExamDetail(BaseModel):
    id: str
    kind: str
    level: str
    title: str
    pass_percent: int
    sections: list[ExamSectionOut]


class PlacementResultOut(BaseModel):
    score_by_skill: dict[str, int]
    percent: int
    recommended_level: Literal["A1", "A2"]
    recommended_module: int


class ReadingSummary(BaseModel):
    id: str
    level: str
    title: str
    title_uz: str
    question_count: int


class ReadingDetail(BaseModel):
    id: str
    version: int
    level: str
    title: str
    title_uz: str
    body: str
    glossary: dict[str, str]
    questions: list[ExerciseOut]
