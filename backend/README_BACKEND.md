# Deutsch Mastery — backend

FastAPI + SQLAlchemy 2 (async, asyncpg) + Alembic + PostgreSQL 17. Contract: `../PROJECT_PLAN.md` §4–§6.
OpenAPI UI: `http://localhost:8001/api/docs` (compose) — all endpoints live under `/api`.

## Layout
- `app/core` — settings (`config.py`, reads env and the repo-root `.env`), async DB, security (Argon2id, JWT cookie
  `dm_session`), in-memory rate limiter.
- `app/models` (tables), `app/schemas` (API models), `app/repositories`, `app/services`
  (grading, srs, lessons, exercises, vocabulary/review, progress, exams/placement, writing, speaking, `ai/`),
  `app/api` (routers).
- `alembic/versions/0001_initial_schema.py` — full schema.
- `scripts/seed.py`, `scripts/export_content.py`; `scripts/validate_content.py` is shared with content authors.

## Ports (coexists with other local projects)
db → host `127.0.0.1:5433`, backend → host `8001`, frontend → host `8080` (nginx proxies `/api` to `backend:8000`).

## Commands actually run (Windows, Git Bash, from repo root unless noted)
```bash
cp .env.example .env            # then filled with generated dev values (passwords, JWT_SECRET, DEMO_PASSWORD)
docker compose up -d db
cd backend
python -m alembic upgrade head                 # -> Running upgrade  -> 0001, initial schema
python -m alembic check                        # -> No new upgrade operations detected.
python -m scripts.seed --demo                  # -> seed ok: lessons=18, ... retired_now=0, demo user ok
python -m scripts.seed                         # second run: same counts, nothing retired (idempotent)
python -m scripts.export_content out.json      # DB -> JSON dump of all content tables
python -m pytest -q                            # needs TEST_DATABASE_URL (see below)
cd ..
docker compose build backend
docker compose up -d backend                   # entrypoint: alembic upgrade head -> seed (--demo if DEMO_PASSWORD) -> uvicorn
curl localhost:8001/api/health                 # {"status":"ok","db":"ok"}
```

## Tests
`TEST_DATABASE_URL` (in `.env`) must point to a separate database, e.g.
`postgresql+asyncpg://deutsch:<pw>@localhost:5433/deutsch_mastery_test`. The test session creates it if missing,
**drops and recreates its `public` schema**, runs the Alembic migration, and seeds `tests/fixtures/content/`.
`tests/test_unit.py` runs without a database; `tests/test_api.py` is skipped when `TEST_DATABASE_URL` is unset.

## Seed rules
- Every file under `content/` is validated with `app/content_schema.py`; any invalid file or duplicate exercise id
  aborts the seed (one transaction, nothing written).
- Upsert by stable id; exercises missing from the files become `retired=true` (never deleted; attempts keep pointing
  at them). Duplicate vocab ids: first definition by lesson order wins, later lessons link it as review vocabulary.
- Lessons whose `module.json` does not exist yet get a placeholder module row (title "N-modul"), replaced when the
  file appears. Module tests become exams `mtest-<module id>` (pass 70%), sections grouped by skill.
- `--demo` creates/updates `demo@deutsch-mastery.local` with password `DEMO_PASSWORD` (refuses when unset).

## AI
`AI_PROVIDER=none|openai|gemini`, key in `OPENAI_API_KEY`/`GEMINI_API_KEY`, optional `AI_MODEL`
(defaults `gpt-4o-mini` / `gemini-2.0-flash`). Without a provider `/api/ai/tutor` returns 503 and everything else
works. Per-user cap `AI_DAILY_LIMIT` (tutor messages + AI writing feedback per UTC day) and 10 requests/minute.
Replies are plain text — the frontend must render them as text, never as HTML.
