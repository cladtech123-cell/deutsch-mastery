"""Speaking: word-level diff between target and browser-recognized text. Audio never reaches the server (D8)."""
from difflib import SequenceMatcher

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Exercise, SpeakingAttempt, User
from app.repositories.progress import bump_daily
from app.schemas.progress import DiffWord, SpeakingIn, SpeakingOut
from app.services.grading import normalize


def word_diff(target: str, recognized: str) -> tuple[int, list[DiffWord]]:
    """Similarity 0..100 = share of target words matched in order; diff marks each target word."""
    shown = target.split()
    t = [normalize(w) for w in shown]
    r = normalize(recognized).split()
    ok = [False] * len(t)
    for block in SequenceMatcher(a=t, b=r, autojunk=False).get_matching_blocks():
        for i in range(block.a, block.a + block.size):
            ok[i] = True
    # words that normalize to "" (pure punctuation like "—") are neither right nor wrong
    pairs = [(w, k) for w, n, k in zip(shown, t, ok) if n]
    matched = sum(k for _, k in pairs)
    return (round(100 * matched / len(pairs)) if pairs else 0), [DiffWord(word=w, ok=k) for w, k in pairs]


async def record(session: AsyncSession, user: User, body: SpeakingIn) -> SpeakingOut:
    if body.exercise_id and await session.get(Exercise, body.exercise_id) is None:
        raise HTTPException(404, "Mashq topilmadi.")
    similarity, diff = word_diff(body.target_text, body.recognized_text) if body.recognized_text else (None, [])
    attempt = SpeakingAttempt(user_id=user.id, exercise_id=body.exercise_id, target_text=body.target_text,
                              recognized_text=body.recognized_text, similarity=similarity,
                              self_rating=body.self_rating)
    session.add(attempt)
    good = (similarity or 0) >= 80 or (body.self_rating or 0) >= 4
    await bump_daily(session, user.id, 1, int(good))  # counts toward streak/weekly activity
    await session.commit()
    return SpeakingOut(id=attempt.id, similarity=similarity, diff=diff)
