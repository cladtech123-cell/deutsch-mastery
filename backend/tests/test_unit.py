"""Pure unit tests — no database."""
import json

import httpx
import pytest

from app.services import grading, placement, srs
from app.services.ai.providers import GeminiProvider, Msg, OpenAIProvider
from app.services.speaking import word_diff
from app.services.writing import rubric


# --- grading -------------------------------------------------------------------------------------------------
def test_text_exact_and_punctuation_ignored():
    g = grading.grade("translate_uz_de", "Danke!", ["Vielen Dank!"], None, "Danke")
    assert g.correct and g.warning is None
    assert grading.grade("translate_uz_de", "Danke!", ["Vielen Dank!"], None, "vielen dank").correct


def test_case_only_difference_is_correct_with_warning():
    g = grading.grade("dictation", "Auf Wiedersehen", [], None, "auf wiedersehen")
    assert g.correct and "Auf Wiedersehen" in g.warning


def test_umlaut_transliteration_is_correct_with_warning():
    g = grading.grade("fill_blank", "Tschüs", [], None, "Tschues")
    assert g.correct and g.warning
    g = grading.grade("fill_blank", "heiße", [], None, "heisse")
    assert g.correct and g.warning
    assert not grading.grade("fill_blank", "Tschüs", [], None, "Tschos").correct


def test_uzbek_apostrophe_variants():
    for variant in ("yoʻq", "yo‘q", "yo’q", "yo`q"):
        g = grading.grade("translate_de_uz", "yo'q", [], None, variant)
        assert g.correct and g.warning is None, variant


def test_choice_and_wrong_shapes():
    assert grading.grade("multiple_choice", "Guten Morgen!", [], None, "Guten Morgen!").correct
    assert not grading.grade("multiple_choice", "Guten Morgen!", [], None, "Guten Abend!").correct
    assert not grading.grade("fill_blank", "bin", [], None, ["bin"]).correct
    assert not grading.grade("fill_blank", "bin", [], None, None).correct


def test_order_words_accepts_token_list_and_alternatives():
    assert grading.grade("order_words", "Ich bin Tom", [], None, ["Ich", "bin", "Tom"]).correct
    assert grading.grade("order_words", "Heute lerne ich", ["Ich lerne heute"], None, ["Ich", "lerne", "heute"]).correct
    assert not grading.grade("order_words", "Ich bin Tom", [], None, ["bin", "Ich", "Tom"]).correct


def test_match_is_all_or_nothing():
    key = {"Hallo": "Salom", "Danke": "Rahmat", "Nein": "Yo'q"}
    assert grading.grade("match", key, [], None, dict(key)).correct
    assert not grading.grade("match", key, [], None, {"Hallo": "Salom", "Danke": "Yo'q", "Nein": "Rahmat"}).correct
    assert not grading.grade("match", key, [], None, {"Hallo": "Salom", "Danke": "Rahmat"}).correct


def test_open_type_criteria():
    crit = {"min_words": 3, "required_words": ["ich", "heiße"], "sample": "Ich heiße Aziz."}
    g = grading.grade("short_text", None, [], crit, "Hallo, ich heiße Aziz.")
    assert g.correct and all(c.ok for c in g.checks)
    g = grading.grade("short_text", None, [], crit, "Hallo Aziz")
    assert not g.correct and [c.ok for c in g.checks] == [False, False, False]


# --- SM-2 ----------------------------------------------------------------------------------------------------
def test_sm2_progression_and_states():
    c = srs.CardState()
    c = srs.sm2(c, 4)
    assert (c.repetitions, c.interval_days) == (1, 1) and srs.state_for(c.interval_days) == "learning"
    c = srs.sm2(c, 4)
    assert (c.repetitions, c.interval_days) == (2, 6)
    c = srs.sm2(c, 5)
    assert c.repetitions == 3 and c.interval_days == 15 and srs.state_for(c.interval_days) == "review"
    c = srs.sm2(c, 5)
    assert c.interval_days >= 21 and srs.state_for(c.interval_days) == "mastered"


def test_sm2_lapse_resets():
    c = srs.CardState(ease=2.5, interval_days=30, repetitions=5, lapses=0)
    c = srs.sm2(c, 1)
    assert (c.repetitions, c.interval_days, c.lapses) == (0, 1, 1) and c.ease < 2.5


def test_sm2_ease_floor_and_bounds():
    c = srs.CardState(ease=1.3)
    assert srs.sm2(c, 0).ease == 1.3
    with pytest.raises(ValueError):
        srs.sm2(c, 6)


# --- speaking, writing, placement ----------------------------------------------------------------------------
def test_word_diff():
    sim, diff = word_diff("Ich bin Tom.", "ich bin tom")
    assert sim == 100 and all(d.ok for d in diff)
    sim, diff = word_diff("Ich bin Tom.", "ich Tom")
    assert sim == 67 and [d.ok for d in diff] == [True, False, True]


def test_writing_rubric():
    checks = {c.name: c for c in rubric("hallo! Ich bin Aziz. ich komme aus Taschkent", 5, 40, ["bin", "wohne"])}
    assert checks["length"].ok
    assert not checks["required_words"].ok and "wohne" in checks["required_words"].message
    assert not checks["capitalization"].ok
    assert not checks["punctuation"].ok


def test_placement_bands():
    assert placement.recommend(0) == ("A1", 1)
    assert placement.recommend(50) == ("A1", 7)
    assert placement.recommend(80) == ("A2", 13)
    assert placement.recommend(100) == ("A2", 19)


# --- AI providers: request shape against a mock transport (no network) ---------------------------------------
async def test_openai_and_gemini_payloads():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen[request.url.host] = (request.headers, json.loads(request.content))
        if "openai" in request.url.host:
            return httpx.Response(200, json={"choices": [{"message": {"content": " Hallo! "}}]})
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": "Servus"}]}}]})

    t = httpx.MockTransport(handler)
    assert await OpenAIProvider("k1", "m", t).chat("sys", [Msg("user", "hi")]) == "Hallo!"
    assert await GeminiProvider("k2", "g", t).chat("sys", [Msg("assistant", "a"), Msg("user", "b")]) == "Servus"
    h, body = seen["api.openai.com"]
    assert h["authorization"] == "Bearer k1" and body["messages"][0] == {"role": "system", "content": "sys"}
    h, body = seen["generativelanguage.googleapis.com"]
    assert h["x-goog-api-key"] == "k2" and [c["role"] for c in body["contents"]] == ["model", "user"]
