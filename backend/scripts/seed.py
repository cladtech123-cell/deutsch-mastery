"""Load content/ into PostgreSQL. Idempotent upsert by stable id; never deletes content.

Usage (from backend/):  python -m scripts.seed [--content-dir PATH] [--demo]

- Every JSON file is validated with app.content_schema (via scripts.validate_content.load_all); any invalid
  file or duplicate exercise id aborts the whole seed (single transaction, nothing written).
- Exercises that disappeared from the files are marked retired=true (attempt history stays valid).
- Duplicate vocab ids: the first definition by lesson order wins; later lessons link it as review.
- --demo creates/updates demo@deutsch-mastery.local with password from env DEMO_PASSWORD.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, select, update  # noqa: E402
from sqlalchemy.dialects.postgresql import insert  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402

from app import content_schema as cs  # noqa: E402
from app.core.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models import (  # noqa: E402
    Exam, Exercise, GrammarTopic, Lesson, LessonGrammar, LessonVocabulary, Level, Module, ReadingText, User,
    UserSettings, VocabularyItem, WritingTask,
)
from scripts.validate_content import load_all  # noqa: E402

DEMO_EMAIL = "demo@deutsch-mastery.local"
LEVELS = [{"code": "A1", "title": "A1 — Boshlang'ich daraja", "order": 1},
          {"code": "A2", "title": "A2 — Asosiy daraja", "order": 2}]
MODULE_TEST_PASS = 70


class SeedError(Exception):
    pass


def chash(model) -> str:
    return hashlib.sha256(json.dumps(model.model_dump(mode="json"), sort_keys=True).encode()).hexdigest()


def module_id(level: str, number: int) -> str:
    return f"{level.lower()}-m{number:02d}"


async def upsert(session: AsyncSession, model, rows: list[dict], keys: list[str]) -> None:
    for i in range(0, len(rows), 500):  # stay far below asyncpg's 32767 bind-parameter limit
        chunk = rows[i:i + 500]
        stmt = insert(model).values(chunk)
        cols = {c: stmt.excluded[c] for c in chunk[0] if c not in keys}
        await session.execute(stmt.on_conflict_do_update(index_elements=keys, set_=cols) if cols
                              else stmt.on_conflict_do_nothing())


def ex_row(e: cs.Exercise, *, kind: str, owner: str, level: str, order: int, module: str | None = None,
           lesson: str | None = None, section: str | None = None) -> dict:
    return dict(
        id=e.id, version=e.version, retired=False, level=level, module_id=module, lesson_id=lesson,
        owner_kind=kind, owner_id=owner, section=section, skill=e.skill, topic=e.topic,
        grammar_topic=e.grammar_topic, difficulty=e.difficulty, question_type=e.type, question=e.question,
        prompt_de=e.prompt_de, options=e.options, pairs=[list(p) for p in e.pairs] if e.pairs else None,
        correct_answer=e.correct_answer, accepted_answers=e.accepted_answers,
        criteria=e.criteria.model_dump() if e.criteria else None, hint=e.hint, explanation=e.explanation,
        error_type=e.error_type, points=e.points, audio_text=e.audio_text, order=order,
    )


SKILL_TITLES = {"vocabulary": "Lug'at", "grammar": "Grammatika", "reading": "O'qish (Lesen)",
                "listening": "Tinglash (Hören)", "writing": "Yozish (Schreiben)", "speaking": "Gapirish (Sprechen)"}


def _by_skill(exercises: list[cs.Exercise]) -> list[dict]:
    """Module tests have no sections in the file: group them by skill, in order of first appearance."""
    groups: dict[str, list[str]] = {}
    for e in exercises:
        groups.setdefault(e.skill, []).append(e.id)
    return [{"skill": k, "title": SKILL_TITLES[k], "exercise_ids": v} for k, v in groups.items()]


def load(content_dir: Path) -> list:
    objs, errors = load_all(content_dir)
    if errors:
        raise SeedError("invalid content files:\n" + "\n".join(f"  {p}: {m}" for p, m in errors))
    seen: dict[str, Path] = {}
    dups = []
    for path, o in objs:
        for e in cs.all_exercises(o):
            if e.id in seen:
                dups.append(f"  {e.id}: {seen[e.id]} and {path}")
            seen[e.id] = path
    if dups:
        raise SeedError("duplicate exercise ids:\n" + "\n".join(dups))
    return [o for _, o in objs]


async def seed(session: AsyncSession, content_dir: Path, log=print) -> dict[str, int]:
    objs = load(content_dir)
    lessons = sorted((o for o in objs if isinstance(o, cs.Lesson)), key=lambda l: (l.module, l.order))
    modules = [o for o in objs if isinstance(o, cs.Module)]
    grammar = [o for o in objs if isinstance(o, cs.GrammarTopic)]
    exams = [o for o in objs if isinstance(o, cs.Exam)]
    readings = [o for o in objs if isinstance(o, cs.ReadingText)]

    await upsert(session, Level, LEVELS, ["code"])

    # modules: real files, plus a placeholder for lessons whose module.json is not written yet
    mod_rows = {m.id: dict(id=m.id, level=m.level, number=m.number, title=m.title, title_de=m.title_de,
                           goals=m.goals, writing_task=m.writing_task.model_dump(), version=m.version,
                           content_hash=chash(m)) for m in modules}
    lesson_ids_in_files = {l.id for l in lessons}
    for m in modules:
        for lid in m.lessons:
            if lid not in lesson_ids_in_files:
                log(f"WARN {m.id}: lesson file for {lid} missing")
    for l in lessons:
        mid = module_id(l.level, l.module)
        if mid not in mod_rows:
            log(f"WARN module file for {mid} missing; placeholder row used")
            await session.execute(insert(Module).values(
                id=mid, level=l.level, number=l.module, title=f"{l.module}-modul", title_de=f"Modul {l.module}",
                goals=[], writing_task=None, version=0, content_hash="").on_conflict_do_nothing())
    if mod_rows:
        await upsert(session, Module, list(mod_rows.values()), ["id"])

    if grammar:
        await upsert(session, GrammarTopic, [dict(
            id=g.id, level=g.level, order=g.order, title=g.title, prerequisites=list(g.prerequisites),
            next=list(g.next), version=g.version,
            body={k: v for k, v in g.model_dump(mode="json").items()
                  if k in ("rule", "when", "structure", "explanation", "examples", "common_mistakes")},
        ) for g in grammar], ["id"])

    ex_rows: list[dict] = []
    vocab_rows: dict[str, dict] = {}
    if lessons:
        await upsert(session, Lesson, [dict(
            id=l.id, module_id=module_id(l.level, l.module), order=l.order, title=l.title, title_de=l.title_de,
            goal=l.goal, skill_focus=list(l.skill_focus), version=l.version, content_hash=chash(l),
            sections={k: v for k, v in l.model_dump(mode="json").items()
                      if k in ("explanation", "grammar", "listening", "situation")},
        ) for l in lessons], ["id"])
        links: list[dict] = []
        for l in lessons:
            linked = set()
            for v in l.vocabulary:
                if v.id in vocab_rows:
                    log(f"WARN vocab {v.id} redefined in {l.id}; keeping {vocab_rows[v.id]['first_lesson_id']}")
                    is_review = True
                else:
                    vocab_rows[v.id] = dict(v.model_dump(), level=l.level, first_lesson_id=l.id)
                    is_review = False
                if v.id not in linked:
                    links.append(dict(lesson_id=l.id, vocab_id=v.id, is_review=is_review))
                    linked.add(v.id)
            for r in l.review_vocabulary:
                if r not in linked:
                    links.append(dict(lesson_id=l.id, vocab_id=r, is_review=True))
                    linked.add(r)
            for i, e in enumerate(l.exercises):
                ex_rows.append(ex_row(e, kind="lesson", owner=l.id, level=l.level, order=i,
                                      module=module_id(l.level, l.module), lesson=l.id, section="exercises"))
            for i, e in enumerate(l.final_test):
                ex_rows.append(ex_row(e, kind="final", owner=l.id, level=l.level, order=i,
                                      module=module_id(l.level, l.module), lesson=l.id, section="final_test"))
        await upsert(session, VocabularyItem, list(vocab_rows.values()), ["id"])
        known = set(vocab_rows) | set((await session.scalars(select(VocabularyItem.id))).all())
        for link in [k for k in links if k["vocab_id"] not in known]:
            log(f"WARN {link['lesson_id']}: review vocab {link['vocab_id']} is not defined anywhere; skipped")
        links = [k for k in links if k["vocab_id"] in known]
        lesson_ids = [l.id for l in lessons]
        # link tables are derived data: rebuild them for the lessons present in the files
        await session.execute(delete(LessonVocabulary).where(LessonVocabulary.lesson_id.in_(lesson_ids)))
        await session.execute(delete(LessonGrammar).where(LessonGrammar.lesson_id.in_(lesson_ids)))
        if links:
            await upsert(session, LessonVocabulary, links, ["lesson_id", "vocab_id"])
        grammar_links = {(l.id, g.topic_id) for l in lessons for g in l.grammar}
        if grammar_links:
            await upsert(session, LessonGrammar, [dict(lesson_id=a, topic_id=b) for a, b in sorted(grammar_links)],
                         ["lesson_id", "topic_id"])

    for g in grammar:
        ex_rows += [ex_row(e, kind="grammar", owner=g.id, level=g.level, order=i) for i, e in enumerate(g.exercises)]
    for r in readings:
        ex_rows += [ex_row(e, kind="reading", owner=r.id, level=r.level, order=i) for i, e in enumerate(r.questions)]

    exam_rows = []
    for x in exams:
        kind = "placement" if x.kind == "placement" else "exam"
        n = 0
        for s in x.sections:
            for e in s.exercises:
                ex_rows.append(ex_row(e, kind=kind, owner=x.id, level=x.level, order=n, section=s.title))
                n += 1
        exam_rows.append(dict(id=x.id, kind=x.kind, level=x.level, title=x.title, pass_percent=x.pass_percent,
                              sections=[{"skill": s.skill, "title": s.title,
                                         "exercise_ids": [e.id for e in s.exercises]} for s in x.sections]))
    writing_rows = []
    for m in modules:
        tid = f"mtest-{m.id}"
        ex_rows += [ex_row(e, kind="module_test", owner=tid, level=m.level, order=i, module=m.id,
                           section="module_test") for i, e in enumerate(m.module_test)]
        exam_rows.append(dict(id=tid, kind="module_test", level=m.level, title=f"{m.number}-modul testi: {m.title}",
                              pass_percent=MODULE_TEST_PASS,
                              sections=_by_skill(m.module_test)))
        w = m.writing_task
        writing_rows.append(dict(id=w.id, module_id=m.id, level=m.level, title=w.title, task_uz=w.task_uz,
                                 required_words=w.required_words, min_words=w.min_words, max_words=w.max_words,
                                 criteria=w.criteria, sample_answer=w.sample_answer))

    if readings:
        await upsert(session, ReadingText, [dict(id=r.id, level=r.level, title=r.title, title_uz=r.title_uz,
                                                 body=r.body, glossary=r.glossary, version=r.version)
                                            for r in readings], ["id"])
    if exam_rows:
        await upsert(session, Exam, exam_rows, ["id"])
    if writing_rows:
        await upsert(session, WritingTask, writing_rows, ["id"])
    if ex_rows:
        await upsert(session, Exercise, ex_rows, ["id"])
    live = [r["id"] for r in ex_rows]
    retired = (await session.execute(
        update(Exercise).where(Exercise.id.not_in(live), Exercise.retired.is_(False))
        .values(retired=True).returning(Exercise.id))).scalars().all()
    for rid in retired:
        log(f"retired exercise {rid} (no longer in content files)")
    return {"lessons": len(lessons), "modules": len(modules), "grammar_topics": len(grammar), "exams": len(exam_rows),
            "reading_texts": len(readings), "writing_tasks": len(writing_rows), "vocabulary": len(vocab_rows),
            "exercises": len(ex_rows), "retired_now": len(retired)}


async def seed_demo(session: AsyncSession, password: str) -> None:
    user = await session.scalar(select(User).where(User.email == DEMO_EMAIL))
    if user is None:
        user = User(email=DEMO_EMAIL, password_hash=hash_password(password), display_name="Demo", is_demo=True)
        session.add(user)
        await session.flush()
        session.add(UserSettings(user_id=user.id, onboarding_done=True))
    else:
        user.password_hash, user.is_demo = hash_password(password), True


async def main() -> int:
    for stream in (sys.stdout, sys.stderr):  # Windows consoles default to cp125x; content has umlauts
        stream.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--content-dir", type=Path, default=settings.CONTENT_DIR)
    p.add_argument("--demo", action="store_true", help="create/update the demo user (needs env DEMO_PASSWORD)")
    args = p.parse_args()
    demo_pw = settings.DEMO_PASSWORD
    if args.demo and not demo_pw:
        print("ERROR: --demo needs the DEMO_PASSWORD environment variable", file=sys.stderr)
        return 2
    engine = create_async_engine(settings.DATABASE_URL)
    try:
        async with async_sessionmaker(engine)() as session:
            try:
                counts = await seed(session, args.content_dir.resolve())
            except SeedError as e:
                print(f"ERROR: {e}", file=sys.stderr)
                return 1
            if args.demo:
                await seed_demo(session, demo_pw)
            await session.commit()
    finally:
        await engine.dispose()
    print("seed ok: " + ", ".join(f"{k}={v}" for k, v in counts.items()) + (", demo user ok" if args.demo else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
