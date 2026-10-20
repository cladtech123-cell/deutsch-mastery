"""SM-2 spaced repetition (PROJECT_PLAN D7 and §6 "SM-2 holatlari")."""
from dataclasses import dataclass
from datetime import datetime, timedelta

REVIEWS_PER_DAY = 100


@dataclass
class CardState:
    ease: float = 2.5
    interval_days: int = 0
    repetitions: int = 0
    lapses: int = 0


def state_for(interval_days: int) -> str:
    if interval_days >= 21:
        return "mastered"
    if interval_days >= 7:
        return "review"
    return "learning"


def sm2(card: CardState, quality: int) -> CardState:
    if not 0 <= quality <= 5:
        raise ValueError("quality must be 0..5")
    ease = max(1.3, card.ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    if quality < 3:
        return CardState(ease, 1, 0, card.lapses + 1)
    reps = card.repetitions + 1
    interval = 1 if reps == 1 else 6 if reps == 2 else max(1, round(card.interval_days * card.ease))
    return CardState(ease, interval, reps, card.lapses)


def due_at(now: datetime, interval_days: int) -> datetime:
    return now + timedelta(days=interval_days)
