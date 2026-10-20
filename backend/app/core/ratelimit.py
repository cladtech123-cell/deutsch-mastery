"""Simple in-memory sliding-window limiter.

shortcut: per-process memory, so limits are per uvicorn worker and reset on restart; move to Redis if we run >1 worker.
"""
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

_hits: dict[str, deque[float]] = defaultdict(deque)


def hit(key: str, limit: int, window: float = 60.0) -> None:
    now = time.monotonic()
    q = _hits[key]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(429, "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.")
    q.append(now)


def reset() -> None:
    _hits.clear()


def client_ip(request: Request) -> str:
    # uvicorn --proxy-headers already rewrites request.client from X-Forwarded-For behind nginx
    return request.client.host if request.client else "unknown"
