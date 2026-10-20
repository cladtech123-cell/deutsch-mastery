"""Integration tests: real FastAPI app + real PostgreSQL (TEST_DATABASE_URL), fixture content from tests/fixtures."""
import json
import shutil
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, text, update

from app.models import (
    DailyActivity, Exercise, ExerciseAttempt, Lesson, LessonProgress, ReviewCard, User, VocabularyItem,
)
from app.services import srs
from tests.conftest import FIXTURE_CONTENT, register

LESSON = "a1-m01-l1"
KEY_FIELDS = {"correct_answer", "accepted_answers", "explanation", "pairs", "sample"}


def walk_keys(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield k
            yield from walk_keys(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from walk_keys(v)


async def answer_key(db, exercise_id: str):
    async with db() as s:
        ex = await s.get(Exercise, exercise_id)
        return ex.correct_answer if ex.question_type != "order_words" else ex.correct_answer.split()


async def user_id(db, email: str) -> uuid.UUID:
    async with db() as s:
        return await s.scalar(select(User.id).where(User.email == email))


# --- schema / migrations ---------------------------------------------------------------------------------------
async def test_migrations_applied_and_match_models(db):
    from alembic.autogenerate import compare_metadata
    from alembic.migration import MigrationContext

    from app.models import Base

    async with db() as s:
        assert await s.scalar(text("select version_num from alembic_version")) == "0001"
        conn = await s.connection()
        diff = await conn.run_sync(lambda c: compare_metadata(MigrationContext.configure(c), Base.metadata))
    assert diff == []


async def test_health(client):
    r = await client.get("/api/health")
    assert r.json() == {"status": "ok", "db": "ok"}


# --- auth ------------------------------------------------------------------------------------------------------
async def test_register_login_logout_me(client, db):
    email = f"Mixed{uuid.uuid4().hex[:6]}@Example.com"
    r = await client.post("/api/auth/register", json={"email": email, "password": "parol-12345", "display_name": "A"})
    assert r.status_code == 201 and r.json()["email"] == email.lower()
    cookie = r.headers["set-cookie"]
    assert "dm_session=" in cookie and "HttpOnly" in cookie and "samesite=lax" in cookie.lower()
    assert (await client.get("/api/auth/me")).json()["email"] == email.lower()

    async with db() as s:
        u = await s.scalar(select(User).where(User.email == email.lower()))
    assert u.password_hash.startswith("$argon2id$") and "parol-12345" not in u.password_hash

    dup = await client.post("/api/auth/register", json={"email": email, "password": "parol-12345", "display_name": "B"})
    assert dup.status_code == 409 and isinstance(dup.json()["detail"], str)

    assert (await client.post("/api/auth/logout")).status_code == 204
    assert (await client.get("/api/auth/me")).status_code == 401
    bad = await client.post("/api/auth/login", json={"email": email, "password": "wrong-pass"})
    assert bad.status_code == 401
    ok = await client.post("/api/auth/login", json={"email": email.upper(), "password": "parol-12345"})
    assert ok.status_code == 200 and (await client.get("/api/auth/me")).status_code == 200


async def test_short_password_is_422_with_string_detail(client):
    r = await client.post("/api/auth/register", json={"email": "x@example.com", "password": "123", "display_name": "A"})
    assert r.status_code == 422 and isinstance(r.json()["detail"], str)


async def test_unauthorized_is_401(client):
    for method, path in [("get", "/api/auth/me"), ("get", "/api/curriculum"), ("get", f"/api/lessons/{LESSON}"),
                         ("get", "/api/progress/dashboard"), ("get", "/api/review/queue"),
                         ("get", "/api/vocabulary"), ("get", "/api/settings"), ("get", "/api/writing/submissions")]:
        assert (await getattr(client, method)(path)).status_code == 401, path
    r = await client.post("/api/exercises/a1-m01-l1-e01/check", json={"answer": "x"})
    assert r.status_code == 401
    client.cookies.set("dm_session", "garbage")
    assert (await client.get("/api/auth/me")).status_code == 401


async def test_origin_and_content_type_guards(client, user):
    r = await client.post("/api/exercises/a1-m01-l1-e01/check", json={"answer": "x"},
                          headers={"Origin": "https://evil.example"})
    assert r.status_code == 403
    r = await client.post("/api/exercises/a1-m01-l1-e01/check", content="answer=x",
                          headers={"Content-Type": "application/x-www-form-urlencoded"})
    assert r.status_code == 415
    # dev server and nginx are reachable under both loopback names
    for origin in ("http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5173", "http://127.0.0.1:5173"):
        r = await client.post("/api/exercises/a1-m01-l1-e01/check", json={"answer": "Guten Morgen!"},
                              headers={"Origin": origin})
        assert r.status_code == 200, origin
    # same-origin requests pass even when the public host (e.g. a tunnel URL) is not in ALLOWED_ORIGINS
    r = await client.post("/api/exercises/a1-m01-l1-e01/check", json={"answer": "Guten Morgen!"},
                          headers={"Origin": "https://testserver"})
    assert r.status_code == 200
    r = await client.post("/api/exercises/a1-m01-l1-e01/check", json={"answer": "x"},
                          headers={"Origin": "https://testserver.evil.example"})
    assert r.status_code == 403


async def test_settings_roundtrip(client, user):
    s = (await client.get("/api/settings")).json()
    assert s["current_level"] == "A1" and s["new_per_day"] == 15
    s.update(daily_minutes=45, goal="work", onboarding_done=True)
    assert (await client.put("/api/settings", json=s)).json()["goal"] == "work"
    assert (await client.get("/api/settings")).json()["daily_minutes"] == 45
    s["daily_minutes"] = 20
    assert (await client.put("/api/settings", json=s)).status_code == 422


# --- lessons & exercises -----------------------------------------------------------------------------------------
async def test_lesson_has_no_answer_keys_and_starts_progress(client, db, user):
    r = await client.get(f"/api/lessons/{LESSON}")
    assert r.status_code == 200
    body = r.json()
    for section in ("exercises", "final_test"):
        assert not KEY_FIELDS & set(walk_keys(body[section])), section
    match = next(e for e in body["exercises"] if e["type"] == "match")
    assert sorted(match["left"]) == ["Danke", "Hallo", "Nein", "Tschüs"] and match["options"] is None
    assert len(body["vocabulary"]) == 12 and body["progress"]["status"] == "started"
    assert (await client.get("/api/lessons/nope")).status_code == 404
    curriculum = (await client.get("/api/curriculum")).json()
    lesson = curriculum["levels"][0]["modules"][0]["lessons"][0]
    assert lesson["id"] == LESSON and lesson["status"] == "started"


async def test_retry_prefers_same_skill(client, user):
    # a missed listening item is retried with the other greetings listening item, not vocabulary/speaking
    for _ in range(5):
        r = (await client.post("/api/exercises/a1-m01-l1-e05/check", json={"answer": "Ertalab"})).json()
        assert not r["correct"] and r["retry_exercise"]["id"] == "a1-m01-l1-e08"


async def test_check_correct_incorrect_warning_and_attempts(client, db, user):
    uid = await user_id(db, user["email"])
    r = (await client.post("/api/exercises/a1-m01-l1-e01/check", json={"answer": "Guten Morgen!"})).json()
    assert r["correct"] and r["explanation"] and r["retry_exercise"] is None and r["points"] == 1

    r = (await client.post("/api/exercises/a1-m01-l1-e03/check", json={"answer": "ist"})).json()
    assert not r["correct"] and r["correct_answer"] == "bin" and r["error_type"] == "conjugation"
    retry = r["retry_exercise"]
    assert retry and retry["id"] != "a1-m01-l1-e03" and retry["grammar_topic"] == "g-sein-haben"
    assert "correct_answer" not in retry

    r = (await client.post("/api/exercises/a1-m01-l1-e08/check", json={"answer": "auf wiedersehen"})).json()
    assert r["correct"] and r["warning"]
    r = (await client.post("/api/exercises/a1-m01-l1-e04/check", json={"answer": ["Ich", "bin", "Tom"]})).json()
    assert r["correct"]

    async with db() as s:
        rows = (await s.execute(select(ExerciseAttempt.exercise_id, ExerciseAttempt.is_correct,
                                       ExerciseAttempt.context, ExerciseAttempt.exercise_version)
                                .where(ExerciseAttempt.user_id == uid).order_by(ExerciseAttempt.id))).all()
        day = await s.get(DailyActivity, (uid, datetime.now(UTC).date()))
    assert [(r[0], r[1]) for r in rows] == [("a1-m01-l1-e01", True), ("a1-m01-l1-e03", False),
                                            ("a1-m01-l1-e08", True), ("a1-m01-l1-e04", True)]
    assert {r[2] for r in rows} == {"lesson"} and all(r[3] == 1 for r in rows)
    assert (day.exercises_done, day.correct) == (4, 3)

    # the failed one now shows up in mistakes practice
    p = (await client.get("/api/practice", params={"mode": "mistakes"})).json()
    assert [e["id"] for e in p["exercises"]] == ["a1-m01-l1-e03"]
    # repeating an exercise is recorded as practice
    await client.post("/api/exercises/a1-m01-l1-e03/check", json={"answer": "bin"})
    async with db() as s:
        ctx = await s.scalar(select(ExerciseAttempt.context).where(ExerciseAttempt.user_id == uid)
                             .order_by(ExerciseAttempt.id.desc()).limit(1))
    assert ctx == "practice"


async def test_test_items_cannot_be_checked_individually(client, user):
    for ex_id in ("a1-m01-l1-t01", "mtest-a1-m01-01", "placement-01"):
        r = await client.post(f"/api/exercises/{ex_id}/check", json={"answer": "x"})
        assert r.status_code == 409 and r.json()["detail"] == "Bu savol test ichida tekshiriladi.", ex_id
    assert (await client.post("/api/exercises/nope/check", json={"answer": "x"})).status_code == 404


async def _final_answers(db, correct: bool = True) -> dict:
    async with db() as s:
        exs = (await s.scalars(select(Exercise).where(Exercise.owner_kind == "final",
                                                      Exercise.owner_id == LESSON))).all()
    return {e.id: (e.correct_answer if correct else "falsch") for e in exs}


async def test_final_test_progress_and_review_cards(client, db, user):
    uid = await user_id(db, user["email"])
    failed = (await client.post(f"/api/lessons/{LESSON}/final", json={"answers": await _final_answers(db, False)})).json()
    assert not failed["passed"] and failed["percent"] == 0
    async with db() as s:
        assert await s.scalar(select(func.count()).where(ReviewCard.user_id == uid)) == 0

    r = (await client.post(f"/api/lessons/{LESSON}/final", json={"answers": await _final_answers(db)})).json()
    assert r["passed"] and r["percent"] == 100 and r["score"] == r["total"] == 7 and len(r["results"]) == 6
    async with db() as s:
        lp = await s.get(LessonProgress, (uid, LESSON))
        cards = await s.scalar(select(func.count()).where(ReviewCard.user_id == uid))
        attempts = await s.scalar(select(func.count()).where(ExerciseAttempt.user_id == uid,
                                                             ExerciseAttempt.context == "final"))
    assert (lp.status, lp.best_score, lp.last_score, lp.attempts) == ("completed", 100, 100, 2)
    assert cards == 12 and attempts == 12

    # a failed retake keeps the lesson completed and the best score
    await client.post(f"/api/lessons/{LESSON}/final", json={"answers": {}})
    async with db() as s:
        lp = await s.get(LessonProgress, (uid, LESSON))
        await s.refresh(lp)
    assert (lp.status, lp.best_score, lp.last_score, lp.attempts) == ("completed", 100, 0, 3)


async def test_review_queue_caps_and_sm2_updates(client, db, user, monkeypatch):
    uid = await user_id(db, user["email"])
    await client.post(f"/api/lessons/{LESSON}/final", json={"answers": await _final_answers(db)})
    s = (await client.get("/api/settings")).json()
    s["new_per_day"] = 5
    await client.put("/api/settings", json=s)

    q = (await client.get("/api/review/queue")).json()
    assert len(q["cards"]) == 5 and q["new_today_left"] == 5 and q["due_total"] == 5
    assert all(c["state"] == "new" and c["direction"] == "de_uz" and c["vocab"]["de"] for c in q["cards"])

    first = q["cards"][0]["card_id"]
    card = (await client.post(f"/api/review/{first}/answer", json={"quality": 4})).json()
    assert (card["repetitions"], card["interval_days"], card["state"], card["correct_count"]) == (1, 1, "learning", 1)
    for c in q["cards"][1:]:
        await client.post(f"/api/review/{c['card_id']}/answer", json={"quality": 1})
    q2 = (await client.get("/api/review/queue")).json()
    assert q2["new_today_left"] == 0 and q2["cards"] == []  # daily new-card cap reached, nothing due yet

    # make the 5 learned cards due again and cap reviews/day at 2
    async with db() as s:
        await s.execute(update(ReviewCard).where(ReviewCard.user_id == uid, ReviewCard.state != "new")
                        .values(due_at=datetime.now(UTC) - timedelta(hours=1)))
        await s.commit()
    monkeypatch.setattr(srs, "REVIEWS_PER_DAY", 2)
    q3 = (await client.get("/api/review/queue")).json()
    assert len(q3["cards"]) == 2 and q3["due_total"] == 2

    again = (await client.post(f"/api/review/{first}/answer", json={"quality": 4})).json()
    assert (again["repetitions"], again["interval_days"]) == (2, 6)
    lapsed = (await client.post(f"/api/review/{first}/answer", json={"quality": 2})).json()
    assert (lapsed["repetitions"], lapsed["interval_days"], lapsed["lapses"]) == (0, 1, 1)
    assert (await client.post("/api/review/999999/answer", json={"quality": 4})).status_code == 404
    assert (await client.post(f"/api/review/{first}/answer", json={"quality": 9})).status_code == 422


async def test_vocabulary_save_and_filters(client, user):
    r = (await client.post("/api/vocabulary/v-hallo/save")).json()
    assert r["user"]["saved"] is True and r["user"]["state"] == "new"
    saved = (await client.get("/api/vocabulary", params={"saved": "true"})).json()
    assert [i["id"] for i in saved["items"]] == ["v-hallo"] and "greetings" in saved["topics"]
    found = (await client.get("/api/vocabulary", params={"q": "tschü"})).json()
    assert [i["id"] for i in found["items"]] == ["v-tschüs"]
    r = (await client.delete("/api/vocabulary/v-hallo/save")).json()
    assert r["user"]["saved"] is False  # card kept
    assert (await client.post("/api/vocabulary/v-nope/save")).status_code == 404


async def test_users_cannot_touch_each_other(client, db):
    a = await register(client)
    await client.post("/api/vocabulary/v-danke/save")
    await client.post(f"/api/lessons/{LESSON}/final", json={"answers": await _final_answers(db)})
    await client.post("/api/writing/submissions", json={"task_id": "w-a1-m01", "text": "Hallo! Ich bin A."})
    async with db() as s:
        a_card = await s.scalar(select(ReviewCard.id).where(ReviewCard.user_id == await user_id(db, a["email"]))
                                .limit(1))

    await client.post("/api/auth/logout")
    await register(client)  # user B, now logged in
    assert (await client.post(f"/api/review/{a_card}/answer", json={"quality": 5})).status_code == 404
    assert (await client.get("/api/writing/submissions")).json() == []
    assert (await client.get("/api/review/queue")).json()["cards"] == []
    v = (await client.get("/api/vocabulary", params={"q": "danke"})).json()["items"]
    assert v and all(i["user"] is None for i in v)
    d = (await client.get("/api/progress/dashboard")).json()
    assert d["lessons_completed"] == 0 and d["due_reviews"] == 0 and d["recent_results"] == []
    lesson = (await client.get(f"/api/lessons/{LESSON}")).json()
    assert lesson["progress"]["attempts"] == 0


async def test_dashboard_numbers_come_from_db(client, db, user):
    uid = await user_id(db, user["email"])
    await client.post(f"/api/lessons/{LESSON}/final", json={"answers": await _final_answers(db)})
    for _ in range(3):  # 4 wrong attempts on one grammar topic -> weak topic
        await client.post("/api/exercises/g-sein-haben-e01/check", json={"answer": "bin"})
    await client.post("/api/exercises/g-sein-haben-e02/check", json={"answer": "bin"})
    d = (await client.get("/api/progress/dashboard")).json()
    async with db() as s:
        lessons_total = await s.scalar(select(func.count()).select_from(Lesson))
        day = await s.get(DailyActivity, (uid, datetime.now(UTC).date()))
        cards = await s.scalar(select(func.count()).where(ReviewCard.user_id == uid))
    assert d["lessons_completed"] == 1 and d["lessons_total"] == lessons_total
    assert d["course_percent"] == round(100 / lessons_total)
    assert d["due_reviews"] == min(cards, 15)
    assert d["weekly_activity"][-1]["exercises"] == day.exercises_done == 10
    assert d["weekly_activity"][-1]["correct"] == day.correct == 6
    assert d["streak"] == 1 and d["weekly_goal"]["done_days"] == 1 and d["words_learned"] == 0
    assert d["recent_results"][0]["kind"] == "lesson" and d["recent_results"][0]["percent"] == 100
    assert d["weak_topics"] == [{"topic": "g-sein-haben", "accuracy": 20, "attempts": 5}]
    assert d["next_recommendation"]["kind"] == "grammar" and d["next_recommendation"]["id"] == "g-sein-haben"
    # grammar: t02 + 4 practice attempts = 5 (1 correct); vocabulary has only 4 attempts -> null
    assert d["skills"]["grammar"] == 20 and d["skills"]["vocabulary"] is None and d["skills"]["reading"] is None
    stats = (await client.get("/api/progress/stats")).json()
    assert stats["total_attempts"] == 10 and stats["vocabulary"]["new"] == cards


async def test_grammar_reading_listening_and_practice(client, user):
    g = (await client.get("/api/grammar")).json()
    assert [t["id"] for t in g] == ["g-sein-haben"]
    detail = (await client.get("/api/grammar/g-sein-haben")).json()
    assert len(detail["exercises"]) == 3 and not KEY_FIELDS & set(walk_keys(detail["exercises"]))
    texts = (await client.get("/api/reading")).json()
    assert texts[0]["id"] == "r-a2-arzt" and texts[0]["question_count"] >= 2
    rd = (await client.get("/api/reading/r-a2-arzt")).json()
    assert rd["glossary"] and not KEY_FIELDS & set(walk_keys(rd["questions"]))
    ls = (await client.get("/api/listening")).json()["items"]
    assert ls[0]["lesson_id"] == LESSON and [q["id"] for q in ls[0]["questions"]] == ["a1-m01-l1-e05"]
    p = (await client.get("/api/practice", params={"mode": "topic", "topic": "g-sein-haben"})).json()
    assert p["exercises"] and all(e["grammar_topic"] == "g-sein-haben" for e in p["exercises"])
    # A1 user never gets A2 reading questions in practice
    p = (await client.get("/api/practice", params={"mode": "skill", "skill": "reading"})).json()
    assert p["exercises"] == []


async def test_placement_and_module_test(client, db, user):
    pl = (await client.get("/api/placement")).json()
    assert [s["skill"] for s in pl["sections"]] == ["vocabulary", "grammar"]
    r = (await client.post("/api/placement/submit", json={"answers": {
        "placement-01": "Hallo", "placement-02": "Danke", "placement-03": "bin", "placement-04": "falsch"}})).json()
    assert r["percent"] == 75 and r["score_by_skill"] == {"vocabulary": 100, "grammar": 50}
    assert (r["recommended_level"], r["recommended_module"]) == ("A2", 13)

    exams = {e["id"]: e for e in (await client.get("/api/exams")).json()}
    assert exams["mtest-a1-m01"]["kind"] == "module_test" and exams["mtest-a1-m01"]["question_count"] == 8
    detail = (await client.get("/api/exams/mtest-a1-m01")).json()
    assert not KEY_FIELDS & set(walk_keys(detail))
    answers = {}
    for sec in detail["sections"]:
        for e in sec["exercises"]:
            answers[e["id"]] = await answer_key(db, e["id"])
    res = (await client.post("/api/exams/mtest-a1-m01/submit", json={"answers": answers})).json()
    assert res["passed"] and res["percent"] == 100 and res["by_skill"] == {"vocabulary": 100}
    d = (await client.get("/api/progress/dashboard")).json()
    assert sorted(r["kind"] for r in d["recent_results"]) == ["module_test", "placement"]


async def test_writing_checks(client, user):
    tasks = (await client.get("/api/writing/tasks")).json()
    assert tasks[0]["id"] == "w-a1-m01" and "sample_answer" not in tasks[0]
    r = await client.post("/api/writing/submissions", json={"task_id": "w-a1-m01", "text": "hallo ich heiße Aziz"})
    assert r.status_code == 201
    body = r.json()
    checks = {c["name"]: c["ok"] for c in body["checks"]}
    assert checks == {"length": False, "required_words": False, "capitalization": False, "punctuation": False}
    assert body["ai_feedback"] is None and body["sample_answer"]
    good = (await client.post("/api/writing/submissions", json={
        "task_id": "w-a1-m01", "text": "Hallo! Ich bin Aziz. Ich komme aus Usbekistan."})).json()
    assert all(c["ok"] for c in good["checks"]) and good["word_count"] == 8
    assert len((await client.get("/api/writing/submissions")).json()) == 2
    assert (await client.post("/api/writing/submissions", json={"task_id": "nope", "text": "x"})).status_code == 404


async def test_speaking_attempt(client, user):
    r = (await client.post("/api/speaking/attempts", json={
        "exercise_id": "a1-m01-l1-e10", "target_text": "Hallo, Tom! Ich bin Anna.",
        "recognized_text": "hallo tom ich bin", "self_rating": 4})).json()
    assert r["similarity"] == 80 and [d["ok"] for d in r["diff"]] == [True, True, True, True, False]
    r = (await client.post("/api/speaking/attempts", json={"target_text": "Hallo", "self_rating": 3})).json()
    assert r["similarity"] is None and r["diff"] == []
    # speaking practice counts toward daily activity (streak / weekly chart)
    today = (await client.get("/api/progress/dashboard")).json()["weekly_activity"][-1]
    assert today["exercises"] == 2 and today["correct"] == 1


async def test_writing_counts_as_activity(client, user):
    await client.post("/api/writing/submissions", json={"task_id": "w-a1-m01", "text": "Hallo! Ich bin Aziz. Ich komme aus Usbekistan."})
    dash = (await client.get("/api/progress/dashboard")).json()
    assert dash["weekly_activity"][-1]["exercises"] == 1 and dash["streak"] == 1


async def test_tts_without_voice_model(client, user):
    # no Piper model on the test host: status says so, synthesis answers a clear 503, inputs are still validated
    assert (await client.get("/api/tts/status")).json() == {"available": False}
    r = await client.get("/api/tts", params={"text": "Guten Morgen!"})
    assert r.status_code == 503 and "ovoz" in r.json()["detail"]
    assert (await client.get("/api/tts", params={"text": "x" * 401})).status_code == 422
    assert (await client.get("/api/tts", params={"text": "Hallo", "rate": 3})).status_code == 422
    client.cookies.clear()
    assert (await client.get("/api/tts", params={"text": "Hallo"})).status_code == 401


async def test_ai_is_503_without_provider(client, user):
    assert (await client.get("/api/ai/status")).json() == {"configured": False, "provider": "none"}
    r = await client.post("/api/ai/tutor", json={"message": "Was ist der Artikel von Haus?"})
    assert r.status_code == 503 and "sozlanmagan" in r.json()["detail"]


async def test_delete_me_removes_all_user_data(client, db):
    u = await register(client)
    uid = await user_id(db, u["email"])
    await client.post(f"/api/lessons/{LESSON}/final", json={"answers": await _final_answers(db)})
    await client.post("/api/writing/submissions", json={"task_id": "w-a1-m01", "text": "Hallo! Ich bin A."})
    assert (await client.request("DELETE", "/api/users/me", json={"password": "wrong-pass"})).status_code == 403
    assert (await client.request("DELETE", "/api/users/me", json={"password": "parol-12345"})).status_code == 204
    async with db() as s:
        for table in ("users", "user_settings", "exercise_attempts", "lesson_progress", "review_cards",
                      "writing_submissions", "daily_activity"):
            col = "id" if table == "users" else "user_id"
            n = await s.scalar(text(f"select count(*) from {table} where {col} = :u"), {"u": uid})
            assert n == 0, table
    assert (await client.get("/api/auth/me")).status_code == 401
    r = await client.post("/api/auth/login", json={"email": u["email"], "password": "parol-12345"})
    assert r.status_code == 401


async def test_auth_rate_limit(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "AUTH_RATE_PER_MINUTE", 3)
    codes = [(await client.post("/api/auth/login", json={"email": "n@example.com", "password": "x"})).status_code
             for _ in range(4)]
    assert codes == [401, 401, 401, 429]


# --- seed --------------------------------------------------------------------------------------------------------
async def test_seed_is_idempotent_and_retires_removed_exercises(db, tmp_path, client, user):
    from scripts.seed import seed

    async def run(content_dir):
        async with db() as s:
            counts = await seed(s, content_dir, log=lambda *_: None)
            await s.commit()
        async with db() as s:
            snap = {
                "lessons": (await s.execute(select(Lesson.id, Lesson.content_hash).order_by(Lesson.id))).all(),
                "ex": await s.scalar(select(func.count()).select_from(Exercise)),
                "vocab": await s.scalar(select(func.count()).select_from(VocabularyItem)),
                "retired": (await s.scalars(select(Exercise.id).where(Exercise.retired.is_(True)))).all(),
            }
        return counts, snap

    c1, s1 = await run(FIXTURE_CONTENT)
    c2, s2 = await run(FIXTURE_CONTENT)
    assert c1 == c2 and s1 == s2 and s1["retired"] == []

    # an exercise the user already answered disappears from the files -> retired, history kept
    await client.post("/api/exercises/a1-m01-l1-e10/check", json={"answer": "Gute Nacht!"})
    shutil.copytree(FIXTURE_CONTENT, tmp_path / "content")
    lf = tmp_path / "content" / "a1" / "m01" / "l1.json"
    data = json.loads(lf.read_text(encoding="utf-8"))
    data["exercises"] = [e for e in data["exercises"] if e["id"] != "a1-m01-l1-e10"]
    lf.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    c3, s3 = await run(tmp_path / "content")
    assert s3["retired"] == ["a1-m01-l1-e10"] and c3["retired_now"] == 1 and s3["ex"] == s1["ex"]
    lesson = (await client.get(f"/api/lessons/{LESSON}")).json()
    assert "a1-m01-l1-e10" not in [e["id"] for e in lesson["exercises"]]
    async with db() as s:
        assert await s.scalar(select(func.count()).where(ExerciseAttempt.exercise_id == "a1-m01-l1-e10")) >= 1

    # restoring the file brings it back
    _, s4 = await run(FIXTURE_CONTENT)
    assert s4["retired"] == []


async def test_seed_rejects_invalid_files(db, tmp_path):
    import pytest

    from scripts.seed import SeedError, seed

    shutil.copytree(FIXTURE_CONTENT, tmp_path / "content")
    (tmp_path / "content" / "reading" / "broken.json").write_text('{"id": "broken"}', encoding="utf-8")
    async with db() as s:
        with pytest.raises(SeedError, match="broken"):
            await seed(s, tmp_path / "content", log=lambda *_: None)
        await s.rollback()
