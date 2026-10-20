"""Integration fixtures run against a REAL PostgreSQL (TEST_DATABASE_URL). Its public schema is wiped each run.

Unit tests (test_unit.py) need no database.
"""
import asyncio
import uuid
from pathlib import Path

import pytest
from sqlalchemy.engine import make_url

from app.core.config import settings

# must happen before app.core.db is imported anywhere: the app engine is built from settings at import time
if settings.TEST_DATABASE_URL:
    if make_url(settings.TEST_DATABASE_URL) == make_url(settings.DATABASE_URL) and settings.ENV != "test":
        raise RuntimeError("TEST_DATABASE_URL must differ from DATABASE_URL: tests wipe the test database")
    settings.DATABASE_URL = settings.TEST_DATABASE_URL
settings.AUTH_RATE_PER_MINUTE = 10_000
settings.AI_PROVIDER = "none"

FIXTURE_CONTENT = Path(__file__).parent / "fixtures" / "content"
BACKEND = Path(__file__).resolve().parents[1]


async def _create_database_if_missing(url: str) -> None:
    import asyncpg

    u = make_url(url)
    conn = await asyncpg.connect(user=u.username, password=u.password, host=u.host, port=u.port or 5432,
                                 database="postgres")
    try:
        if not await conn.fetchval("select 1 from pg_database where datname = $1", u.database):
            await conn.execute(f'create database "{u.database}"')
    finally:
        await conn.close()


def _alembic(cmd: str, *args) -> None:
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.attributes["url"] = settings.DATABASE_URL
    cfg.attributes["configure_logger"] = False
    getattr(command, cmd)(cfg, *args)


@pytest.fixture(scope="session")
async def db():
    if not settings.TEST_DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL is not set — integration tests need a real PostgreSQL")
    from sqlalchemy import text

    from app.core.db import SessionLocal, engine
    from scripts.seed import seed

    await _create_database_if_missing(settings.DATABASE_URL)
    async with engine.begin() as conn:
        await conn.execute(text("drop schema public cascade"))
        await conn.execute(text("create schema public"))
    await asyncio.to_thread(_alembic, "upgrade", "head")  # env.py runs its own event loop
    async with SessionLocal() as s:
        await seed(s, FIXTURE_CONTENT, log=lambda *_: None)
        await s.commit()
    yield SessionLocal
    await engine.dispose()


@pytest.fixture
async def client(db):
    import httpx

    from app.core import ratelimit
    from app.main import app

    ratelimit.reset()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as c:
        yield c


async def register(client, email: str | None = None, password: str = "parol-12345") -> dict:
    email = email or f"u{uuid.uuid4().hex[:10]}@example.com"
    r = await client.post("/api/auth/register", json={"email": email, "password": password, "display_name": "Test"})
    assert r.status_code == 201, r.text
    return r.json()


@pytest.fixture
async def user(client):
    return await register(client)
