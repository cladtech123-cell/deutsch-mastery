"""Answer grading (PROJECT_PLAN §5 "Baholash"). Pure functions — no DB."""
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Any

from app.content_schema import CHOICE_TYPES, OPEN_TYPES, TEXT_TYPES

_APOSTROPHES = str.maketrans({"ʻ": "'", "‘": "'", "’": "'", "`": "'", "ʼ": "'"})
_UMLAUT_FOLD = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"})


def normalize(text: str, *, lower: bool = True) -> str:
    s = unicodedata.normalize("NFC", text).translate(_APOSTROPHES)
    s = "".join(ch for ch in s if ch == "'" or not unicodedata.category(ch).startswith("P"))
    s = re.sub(r"\s+", " ", s).strip()
    return s.lower() if lower else s


def words(text: str) -> list[str]:
    return normalize(text).split()


@dataclass
class Check:
    name: str
    ok: bool
    message: str


@dataclass
class Grade:
    correct: bool
    warning: str | None = None
    checks: list[Check] = field(default_factory=list)


def _warn(expected: str) -> str:
    return f"Katta-kichik harf / umlautga e'tibor bering: {expected}"


def grade_text(answer: str, candidates: list[str]) -> Grade:
    """Exact (normalized) match → correct; case-only or ae/oe/ue/ss-only difference → correct + warning."""
    a_low = normalize(answer)
    for c in candidates:
        if a_low == normalize(c):
            same_case = normalize(answer, lower=False) == normalize(c, lower=False)
            return Grade(True, None if same_case else _warn(c))
    a_fold = a_low.translate(_UMLAUT_FOLD)
    for c in candidates:
        if a_fold == normalize(c).translate(_UMLAUT_FOLD):
            return Grade(True, _warn(c))
    return Grade(False)


def criteria_checks(text: str, criteria: dict[str, Any]) -> list[Check]:
    ws = words(text)
    n, need = len(ws), criteria.get("min_words", 1)
    checks = [Check("min_words", n >= need, f"So'zlar soni: {n} (kamida {need}).")]
    present = set(ws)
    for w in criteria.get("required_words") or []:
        ok = all(part in present for part in words(w))
        checks.append(Check("required_word", ok, f"\"{w}\" {'ishlatilgan' if ok else 'ishlatilmagan'}."))
    return checks


def grade(question_type: str, correct_answer: Any, accepted: list[str], criteria: dict | None, answer: Any) -> Grade:
    if question_type in CHOICE_TYPES:
        return Grade(isinstance(answer, str) and normalize(answer) == normalize(correct_answer))
    if question_type in TEXT_TYPES:
        if not isinstance(answer, str):
            return Grade(False)
        return grade_text(answer, [correct_answer, *accepted])
    if question_type == "order_words":
        if isinstance(answer, list) and all(isinstance(t, str) for t in answer):
            answer = " ".join(answer)
        if not isinstance(answer, str):
            return Grade(False)
        return grade_text(answer, [correct_answer, *accepted])
    if question_type == "match":
        if not isinstance(answer, dict) or len(answer) != len(correct_answer):
            return Grade(False)
        ok = all(isinstance(answer.get(k), str) and normalize(answer[k]) == normalize(v)
                 for k, v in correct_answer.items())
        return Grade(ok)
    if question_type in OPEN_TYPES:
        if not isinstance(answer, str):
            return Grade(False)
        checks = criteria_checks(answer, criteria or {})
        return Grade(all(c.ok for c in checks), checks=checks)
    return Grade(False)
