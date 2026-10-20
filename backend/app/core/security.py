import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Cookie, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_session
from app.models import User

COOKIE = "dm_session"
_hasher = PasswordHasher()  # argon2id with library defaults (RFC 9106 low-memory profile)


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(hash_: str, password: str) -> bool:
    try:
        return _hasher.verify(hash_, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def set_session_cookie(response: Response, user_id: uuid.UUID) -> None:
    exp = datetime.now(UTC) + timedelta(days=settings.JWT_EXPIRE_DAYS)
    token = jwt.encode({"sub": str(user_id), "exp": exp}, settings.JWT_SECRET, algorithm="HS256")
    response.set_cookie(
        COOKIE, token, max_age=settings.JWT_EXPIRE_DAYS * 86400, httponly=True, samesite="lax",
        secure=settings.ENV == "production", path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE, path="/", httponly=True, samesite="lax", secure=settings.ENV == "production")


async def current_user(
    session: Annotated[AsyncSession, Depends(get_session)],
    dm_session: Annotated[str | None, Cookie()] = None,
) -> User:
    if not dm_session:
        raise HTTPException(401, "Avval tizimga kiring.")
    try:
        user_id = uuid.UUID(jwt.decode(dm_session, settings.JWT_SECRET, algorithms=["HS256"])["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(401, "Sessiya muddati tugagan. Qayta kiring.") from None
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(401, "Sessiya muddati tugagan. Qayta kiring.")
    return user


CurrentUser = Annotated[User, Depends(current_user)]
Session = Annotated[AsyncSession, Depends(get_session)]
