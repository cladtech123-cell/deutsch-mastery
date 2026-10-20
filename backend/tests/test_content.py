"""The real course content (content/) validates and grades against its own answer keys. No database needed."""
import json
from pathlib import Path

import pytest

from app.content_schema import Exam, GrammarTopic, Lesson, Module, ReadingText, all_exercises
from app.services.grading import grade
from scripts.validate_content import cross_check, load_all

CONTENT = Path(__file__).resolve().parents[2] / "content"


@pytest.fixture(scope="module")
def objs():
    objs, errors = load_all(CONTENT)
    assert errors == []
    return objs


def test_content_validates_without_errors(objs):
    errors, _ = cross_check(objs, CONTENT)
    assert errors == []


def test_curriculum_size(objs):
    kinds = [type(o) for _, o in objs]
    assert kinds.count(Module) == 24 and kinds.count(Lesson) == 72 and kinds.count(GrammarTopic) == 27
    exams = {o.id: o.kind for _, o in objs if isinstance(o, Exam)}
    assert exams == {"placement": "placement", "mid-a1": "midterm", "exam-a1": "level_exam",
                     "mid-a2": "midterm", "exam-a2": "level_exam"}
    assert kinds.count(ReadingText) >= 12


def _key(e):
    if e.type == "order_words":
        return e.correct_answer.rstrip(".?!").split()
    if e.type in ("short_text", "speak"):
        return e.criteria.sample
    return e.correct_answer


def test_every_answer_key_and_sample_grades_correct(objs):
    wrong = []
    for _, o in objs:
        for e in all_exercises(o):
            criteria = e.criteria.model_dump() if e.criteria else None
            if not grade(e.type, e.correct_answer, e.accepted_answers, criteria, _key(e)).correct:
                wrong.append(e.id)
    assert wrong == []


def test_vocab_defined_once():
    seen = {}
    for f in sorted(CONTENT.glob("a*/m*/l*.json")):
        for v in json.loads(f.read_text(encoding="utf-8"))["vocabulary"]:
            assert v["id"] not in seen, f"{v['id']} in {f.name} and {seen[v['id']]}"
            seen[v["id"]] = f.name
