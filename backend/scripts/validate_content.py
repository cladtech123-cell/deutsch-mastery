"""Validate all course content JSON against app/content_schema.py plus cross-file rules.

Usage: python backend/scripts/validate_content.py [content_dir] [--only SUBSTRING]
Exit code 1 if any error. --only limits printed errors to files whose path contains SUBSTRING.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pydantic import ValidationError  # noqa: E402

from app.content_schema import (  # noqa: E402
    GRAMMAR_IDS, Exam, GrammarTopic, Lesson, Module, ReadingText, all_exercises,
)


def kind_of(path: Path, root: Path) -> type | None:
    rel = path.relative_to(root).parts
    if rel[0] in ("a1", "a2") and len(rel) == 3:
        return Module if rel[2] == "module.json" else Lesson
    if rel[0] == "grammar":
        return GrammarTopic
    if rel[0] == "exams" or rel == ("placement.json",):
        return Exam
    if rel[0] == "reading":
        return ReadingText
    return None


def load_all(root: Path):
    objs, errors = [], []
    for path in sorted(root.rglob("*.json")):
        model = kind_of(path, root)
        if model is None:
            errors.append((path, "unknown content location"))
            continue
        try:
            objs.append((path, model.model_validate(json.loads(path.read_text(encoding="utf-8")))))
        except (ValidationError, json.JSONDecodeError) as e:
            errors.append((path, str(e)))
    return objs, errors


def cross_check(objs, root: Path):
    errors, warnings = [], []
    vocab_owner: dict[str, Path] = {}
    ex_owner: dict[str, Path] = {}
    lessons = {o.id: p for p, o in objs if isinstance(o, Lesson)}
    grammar = {o.id for _, o in objs if isinstance(o, GrammarTopic)}
    for path, o in objs:
        for e in all_exercises(o):
            if e.id in ex_owner:
                errors.append((path, f"exercise id {e.id} already used in {ex_owner[e.id].relative_to(root)}"))
            ex_owner[e.id] = path
        if isinstance(o, Lesson):
            for v in o.vocabulary:
                if v.id in vocab_owner:
                    errors.append((path, f"vocab {v.id} already defined in {vocab_owner[v.id].relative_to(root)}; "
                                         "move it to review_vocabulary"))
                else:
                    vocab_owner[v.id] = path
        if isinstance(o, Module):
            for lid in o.lessons:
                if lid not in lessons:
                    errors.append((path, f"lesson {lid} file missing"))
        if isinstance(o, GrammarTopic):
            pass  # ids and refs are Literal-checked in content_schema
    for path, o in objs:
        if isinstance(o, Lesson):
            missing = [r for r in o.review_vocabulary if r not in vocab_owner]
            if missing:
                warnings.append((path, f"review_vocabulary not defined anywhere yet: {missing}"))
    if not set(GRAMMAR_IDS) <= grammar:
        warnings.append((root, f"grammar topics missing: {sorted(set(GRAMMAR_IDS) - grammar)}"))
    return errors, warnings


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")  # Windows consoles default to cp1251/cp1252 and choke on umlauts
    args = sys.argv[1:]
    only = None
    if "--only" in args:
        i = args.index("--only")
        only = args[i + 1]
        del args[i:i + 2]
    root = Path(args[0] if args else Path(__file__).resolve().parents[2] / "content").resolve()
    objs, errors = load_all(root)
    e2, warnings = cross_check(objs, root)
    errors += e2

    def show(p: Path) -> bool:
        return only is None or only in str(p).replace("\\", "/")

    def rel(p: Path) -> str:
        return "." if p == root else str(p.relative_to(root)).replace("\\", "/")

    for p, msg in errors:
        if show(p):
            print(f"ERROR {rel(p)}: {msg}")
    for p, msg in warnings:
        if show(p):
            print(f"WARN  {rel(p)}: {msg}")
    counts: dict[str, int] = {}
    for _, o in objs:
        counts[type(o).__name__] = counts.get(type(o).__name__, 0) + 1
    print(f"{len(objs)} files parsed {counts}; {len(errors)} errors, {len(warnings)} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
