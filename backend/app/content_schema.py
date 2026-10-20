"""Pydantic models for course content JSON (content/). Single source of truth, see PROJECT_PLAN.md §5."""
from __future__ import annotations

import re
import unicodedata
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Level = Literal["A1", "A2"]
Skill = Literal["vocabulary", "grammar", "reading", "listening", "writing", "speaking"]
ErrorType = Literal[
    "vocabulary", "article", "case", "conjugation", "word_order", "spelling",
    "plural", "comprehension", "preposition", "tense", "other",
]
# Closed lists: stats, weak topics and retry selection key on these, so parallel authors must not invent labels.
GRAMMAR_IDS = (
    "g-alphabet", "g-pronouns", "g-sein-haben", "g-praesens", "g-verb-position", "g-questions",
    "g-articles", "g-plural", "g-possessive", "g-negation", "g-akkusativ", "g-dativ", "g-pronoun-cases",
    "g-modal-verbs", "g-separable-verbs", "g-imperative", "g-time-prepositions", "g-place-prepositions",
    "g-perfekt", "g-perfekt-aux", "g-praeteritum", "g-comparison", "g-subordinate", "g-reflexive",
    "g-future", "g-polite-requests", "g-adjectives",
)
TOPICS = (
    "alphabet", "greetings", "personal-info", "countries-languages", "numbers", "contact", "family", "people",
    "professions", "work", "daily-routine", "time", "food", "restaurant", "shopping", "clothes", "home", "city",
    "transport", "directions", "leisure", "sports", "invitations", "health", "body", "weather", "travel", "hotel",
    "appointments", "phone", "education", "language-learning", "technology", "media", "services", "household",
    "environment", "events", "celebrations", "future-plans", "past-events", "politeness", "communication", "general",
)
GrammarId = Literal[GRAMMAR_IDS]  # type: ignore[valid-type]
Topic = Literal[TOPICS]  # type: ignore[valid-type]

ExerciseType = Literal[
    "multiple_choice", "situation_choice", "next_line", "reading", "listen_choice", "article", "find_error",
    "fill_blank", "conjugate", "plural", "translate_de_uz", "translate_uz_de", "dictation",
    "match", "order_words", "short_text", "speak",
]
CHOICE_TYPES = {"multiple_choice", "situation_choice", "next_line", "reading", "listen_choice", "article", "find_error"}
TEXT_TYPES = {"fill_blank", "conjugate", "plural", "translate_de_uz", "translate_uz_de", "dictation"}
OPEN_TYPES = {"short_text", "speak"}
AUDIO_TYPES = {"listen_choice", "dictation"}
FORM_KEYS = {"praesens_3sg", "partizip2", "perfekt_aux", "praeteritum"}

Str = Annotated[str, Field(min_length=1)]


def vocab_id(de: str, pos: str, article: str | None) -> str:
    """Deterministic vocab id: v- + slug(article + de for nouns, else de). Umlauts and ß are kept."""
    base = f"{article} {de}" if pos == "noun" and article else de
    s = unicodedata.normalize("NFC", base).lower()
    s = re.sub(r"[^\w\s-]", "", s)
    return "v-" + re.sub(r"[\s_]+", "-", s).strip("-")


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Criteria(Strict):
    min_words: int = Field(ge=1)
    required_words: list[str] = []
    sample: Str


class Exercise(Strict):
    id: Str
    version: int = Field(ge=1)
    type: ExerciseType
    skill: Skill
    topic: Topic
    grammar_topic: GrammarId | None = None
    difficulty: int = Field(ge=1, le=3)
    question: Str
    prompt_de: str | None = None
    options: list[Str] | None = None
    pairs: list[tuple[Str, Str]] | None = None
    correct_answer: str | dict[str, str] | None = None
    accepted_answers: list[Str] = []
    criteria: Criteria | None = None
    hint: str | None = None
    explanation: Str
    error_type: ErrorType = "other"
    points: int = Field(default=1, ge=1, le=10)
    audio_text: str | None = None

    @model_validator(mode="after")
    def _shape(self) -> Exercise:
        t, ans = self.type, self.correct_answer
        if t in AUDIO_TYPES and not self.audio_text:
            raise ValueError(f"{self.id}: '{t}' needs audio_text")
        if self.skill == "grammar" and self.grammar_topic is None:
            raise ValueError(f"{self.id}: grammar exercises need grammar_topic")
        if t in CHOICE_TYPES:
            if not self.options or len(self.options) < 2:
                raise ValueError(f"{self.id}: '{t}' needs >=2 options")
            if not isinstance(ans, str) or ans not in self.options:
                raise ValueError(f"{self.id}: correct_answer must be one of options")
            if len(set(self.options)) != len(self.options):
                raise ValueError(f"{self.id}: duplicate options")
        elif t in TEXT_TYPES:
            if not isinstance(ans, str) or not ans.strip():
                raise ValueError(f"{self.id}: '{t}' needs a string correct_answer")
        elif t == "match":
            if not self.pairs or len(self.pairs) < 3:
                raise ValueError(f"{self.id}: match needs >=3 pairs")
            lefts, rights = [p[0] for p in self.pairs], [p[1] for p in self.pairs]
            if len(set(lefts)) != len(lefts) or len(set(rights)) != len(rights):
                raise ValueError(f"{self.id}: match pairs must be unique on both sides")
            if ans != dict(self.pairs):
                raise ValueError(f"{self.id}: match correct_answer must equal dict(pairs)")
        elif t == "order_words":
            if not self.options or not isinstance(ans, str):
                raise ValueError(f"{self.id}: order_words needs options (tokens) and a sentence answer")
            words = sorted(w.lower() for w in self.options)
            for sentence in [ans, *self.accepted_answers]:
                if sorted(w.lower() for w in sentence.rstrip(".?!").split()) != words:
                    raise ValueError(f"{self.id}: order_words options must be exactly the words of '{sentence}' "
                                     "(no punctuation inside tokens)")
        elif t in OPEN_TYPES:
            if ans is not None or self.criteria is None:
                raise ValueError(f"{self.id}: '{t}' needs criteria and correct_answer=null")
        return self


class Vocab(Strict):
    id: Str
    de: Str
    uz: Str
    pos: Literal[
        "noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction",
        "interjection", "numeral", "phrase", "article", "particle",
    ]
    article: Literal["der", "die", "das"] | None = None
    plural: str | None = None
    forms: dict[str, str] | None = None
    example_de: Str
    example_uz: Str
    topic: Topic

    @model_validator(mode="after")
    def _check(self) -> Vocab:
        expect = vocab_id(self.de, self.pos, self.article)
        if self.id != expect:
            raise ValueError(f"vocab id {self.id} != {expect} (v- + slug of article+word for nouns, else word)")
        if self.pos == "noun":
            if self.article is None or self.plural is None:
                raise ValueError(f"{self.id}: noun needs article and plural ('die ...' or '-')")
            if self.de.split()[0] in ("der", "die", "das"):
                raise ValueError(f"{self.id}: noun 'de' must not include the article")
        if self.pos == "verb":
            if not self.forms or not {"partizip2", "perfekt_aux"} <= self.forms.keys():
                raise ValueError(f"{self.id}: verb forms need partizip2 and perfekt_aux")
            if self.forms["perfekt_aux"] not in ("haben", "sein"):
                raise ValueError(f"{self.id}: perfekt_aux must be haben or sein")
        if self.forms and not self.forms.keys() <= FORM_KEYS:
            raise ValueError(f"{self.id}: forms keys must be from {sorted(FORM_KEYS)}")
        return self


class Example(Strict):
    de: Str
    uz: Str


class Mistake(Strict):
    wrong: Str
    right: Str
    why: Str


class Block(Strict):
    type: Literal["p", "table", "tip"]
    text: str | None = None
    headers: list[str] | None = None
    rows: list[list[str]] | None = None

    @model_validator(mode="after")
    def _check(self) -> Block:
        if self.type == "table":
            if not self.headers or not self.rows or any(len(r) != len(self.headers) for r in self.rows):
                raise ValueError("table needs headers and rows of equal width")
        elif not self.text:
            raise ValueError(f"'{self.type}' block needs text")
        return self


class LessonGrammar(Strict):
    topic_id: GrammarId
    rule: Str
    when: Str
    structure: Str
    examples: list[Example] = Field(min_length=3)
    common_mistakes: list[Mistake] = Field(min_length=1)
    check: list[Str] = Field(min_length=1)


class Line(Strict):
    speaker: Str
    de: Str
    uz: Str


class Listening(Strict):
    title: Str
    lines: list[Line] = Field(min_length=2)
    questions: list[Str] = Field(min_length=1)


class Situation(Strict):
    title: Str
    context_uz: Str
    lines: list[Line] = Field(min_length=2)
    task_uz: Str


class Lesson(Strict):
    id: Str
    version: int = Field(ge=1)
    level: Level
    module: int = Field(ge=1, le=24)
    order: int = Field(ge=1, le=6)
    title: Str
    title_de: Str
    goal: Str
    skill_focus: list[Skill] = Field(min_length=1)
    explanation: list[Block] = Field(min_length=1)
    vocabulary: list[Vocab] = Field(min_length=8, max_length=15)
    review_vocabulary: list[Str] = []
    grammar: list[LessonGrammar] = []
    listening: Listening
    situation: Situation
    exercises: list[Exercise] = Field(min_length=6, max_length=12)
    final_test: list[Exercise] = Field(min_length=5, max_length=10)

    @model_validator(mode="after")
    def _check(self) -> Lesson:
        expect = f"{self.level.lower()}-m{self.module:02d}-l{self.order}"
        if self.id != expect:
            raise ValueError(f"lesson id {self.id} != {expect}")
        if (self.level == "A1") != (self.module <= 12):
            raise ValueError(f"{self.id}: A1 = modules 1-12, A2 = 13-24")
        ex_ids = [e.id for e in self.exercises + self.final_test]
        if len(set(ex_ids)) != len(ex_ids):
            raise ValueError(f"{self.id}: duplicate exercise ids")
        bad = [i for i in ex_ids if not i.startswith(self.id + "-")]
        if bad:
            raise ValueError(f"{self.id}: exercise ids must start with '{self.id}-': {bad}")
        if len({e.type for e in self.exercises}) < 3:
            raise ValueError(f"{self.id}: exercises need >=3 different types")
        own = {e.id for e in self.exercises}
        refs = [r for g in self.grammar for r in g.check] + self.listening.questions
        missing = [r for r in refs if r not in own]
        if missing:
            raise ValueError(f"{self.id}: grammar.check/listening.questions must reference exercises: {missing}")
        return self


class WritingTask(Strict):
    id: Str
    title: Str
    task_uz: Str
    required_words: list[str] = []
    min_words: int = Field(ge=5)
    max_words: int = Field(ge=10)
    criteria: list[Str] = Field(min_length=1)
    sample_answer: Str


class Module(Strict):
    id: Str
    version: int = Field(ge=1)
    level: Level
    number: int = Field(ge=1, le=24)
    title: Str
    title_de: Str
    goals: list[Str] = Field(min_length=1)
    lessons: list[Str] = Field(min_length=3)
    module_test: list[Exercise] = Field(min_length=8, max_length=12)
    writing_task: WritingTask

    @model_validator(mode="after")
    def _check(self) -> Module:
        expect = f"{self.level.lower()}-m{self.number:02d}"
        if self.id != expect:
            raise ValueError(f"module id {self.id} != {expect}")
        if any(not e.id.startswith(f"mtest-{self.id}-") for e in self.module_test):
            raise ValueError(f"{self.id}: module_test ids must start with 'mtest-{self.id}-'")
        if self.writing_task.id != f"w-{self.id}":
            raise ValueError(f"{self.id}: writing_task id must be 'w-{self.id}'")
        return self


class GrammarTopic(Strict):
    id: GrammarId
    version: int = Field(ge=1)
    level: Level
    order: int = Field(ge=1)
    title: Str
    prerequisites: list[GrammarId] = []
    next: list[GrammarId] = []
    rule: Str
    when: Str
    structure: Str
    explanation: list[Block] = []
    examples: list[Example] = Field(min_length=3)
    common_mistakes: list[Mistake] = Field(min_length=1)
    exercises: list[Exercise] = Field(min_length=3)

    @model_validator(mode="after")
    def _check(self) -> GrammarTopic:
        if any(not e.id.startswith(self.id + "-") for e in self.exercises):
            raise ValueError(f"{self.id}: exercise ids must start with '{self.id}-'")
        return self


class ExamSection(Strict):
    skill: Skill
    title: Str
    exercises: list[Exercise] = Field(min_length=1)


class Exam(Strict):
    id: Str
    version: int = Field(ge=1)
    kind: Literal["placement", "midterm", "level_exam"]
    level: Level
    title: Str
    pass_percent: int = Field(ge=1, le=100)
    sections: list[ExamSection] = Field(min_length=1)

    @model_validator(mode="after")
    def _check(self) -> Exam:
        ids = [e.id for s in self.sections for e in s.exercises]
        if len(set(ids)) != len(ids) or any(not i.startswith(self.id + "-") for i in ids):
            raise ValueError(f"{self.id}: exercise ids must be unique and start with '{self.id}-'")
        return self


class ReadingText(Strict):
    id: Str
    version: int = Field(ge=1)
    level: Level
    title: Str
    title_uz: Str
    body: Str
    glossary: dict[str, str]
    questions: list[Exercise] = Field(min_length=2)

    @model_validator(mode="after")
    def _check(self) -> ReadingText:
        if any(not e.id.startswith(self.id + "-q") for e in self.questions):
            raise ValueError(f"{self.id}: question ids must start with '{self.id}-q'")
        return self


def all_exercises(obj: Any) -> list[Exercise]:
    if isinstance(obj, Lesson):
        return obj.exercises + obj.final_test
    if isinstance(obj, Module):
        return obj.module_test
    if isinstance(obj, GrammarTopic):
        return obj.exercises
    if isinstance(obj, Exam):
        return [e for s in obj.sections for e in s.exercises]
    if isinstance(obj, ReadingText):
        return obj.questions
    return []
