"""Dump all content tables (DB -> JSON). Usage (from backend/): python -m scripts.export_content [out.json]

Output: {"<table>": [row, ...], ...} — rows as stored, including retired exercises and answer keys.
"""
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.ext.asyncio import create_async_engine  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.models import (  # noqa: E402
    Exam, Exercise, GrammarTopic, Lesson, LessonGrammar, LessonVocabulary, Level, Module, ReadingText,
    VocabularyItem, WritingTask,
)

TABLES = (Level, Module, Lesson, VocabularyItem, LessonVocabulary, GrammarTopic, LessonGrammar, Exercise,
          ReadingText, Exam, WritingTask)


async def export() -> dict[str, list[dict]]:
    engine = create_async_engine(settings.DATABASE_URL)
    out: dict[str, list[dict]] = {}
    try:
        async with engine.connect() as conn:
            for model in TABLES:
                pk = list(model.__table__.primary_key.columns)
                rows = (await conn.execute(select(model.__table__).order_by(*pk))).mappings().all()
                out[model.__tablename__] = [dict(r) for r in rows]
    finally:
        await engine.dispose()
    return out


def main() -> int:
    data = json.dumps(asyncio.run(export()), ensure_ascii=False, indent=2, default=str)
    if len(sys.argv) > 1:
        Path(sys.argv[1]).write_text(data, encoding="utf-8")
        print(f"exported to {sys.argv[1]}")
    else:
        sys.stdout.reconfigure(encoding="utf-8")
        print(data)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
