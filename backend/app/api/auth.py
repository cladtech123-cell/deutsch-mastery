from fastapi import APIRouter, HTTPException, Request, Response
from sqlalchemy.exc import IntegrityError

from app.core import ratelimit
from app.core.config import settings
from app.core.security import (
    CurrentUser, Session, clear_session_cookie, hash_password, set_session_cookie, verify_password,
)
from app.repositories import users as users_repo
from app.schemas.auth import DeleteMeIn, LoginIn, RegisterIn, SettingsIO, UserOut

router = APIRouter(tags=["auth"])

# verified against when the email is unknown, so login timing does not reveal registered emails
_DUMMY_HASH = hash_password("timing-equaliser-password")


def _limit(request: Request) -> None:
    ratelimit.hit(f"auth:{ratelimit.client_ip(request)}", settings.AUTH_RATE_PER_MINUTE)


@router.post("/auth/register", response_model=UserOut, status_code=201)
async def register(body: RegisterIn, request: Request, response: Response, session: Session):
    _limit(request)
    if await users_repo.get_by_email(session, body.email):
        raise HTTPException(409, "Bu email bilan hisob allaqachon mavjud.")
    try:
        user = await users_repo.create(session, body.email, hash_password(body.password), body.display_name)
        await session.commit()
    except IntegrityError:  # concurrent registration with the same email
        await session.rollback()
        raise HTTPException(409, "Bu email bilan hisob allaqachon mavjud.") from None
    set_session_cookie(response, user.id)
    return user


@router.post("/auth/login", response_model=UserOut)
async def login(body: LoginIn, request: Request, response: Response, session: Session):
    _limit(request)
    user = await users_repo.get_by_email(session, body.email)
    if not verify_password(user.password_hash if user else _DUMMY_HASH, body.password) or user is None:
        raise HTTPException(401, "Email yoki parol noto'g'ri.")
    set_session_cookie(response, user.id)
    return user


@router.post("/auth/logout", status_code=204)
async def logout(response: Response):
    clear_session_cookie(response)


@router.get("/auth/me", response_model=UserOut)
async def me(user: CurrentUser):
    return user


@router.delete("/users/me", status_code=204)
async def delete_me(body: DeleteMeIn, request: Request, response: Response, user: CurrentUser, session: Session):
    _limit(request)
    if not verify_password(user.password_hash, body.password):
        raise HTTPException(403, "Parol noto'g'ri.")
    await users_repo.delete_user(session, user.id)
    await session.commit()
    clear_session_cookie(response)


@router.get("/settings", response_model=SettingsIO, tags=["settings"])
async def get_settings(user: CurrentUser, session: Session):
    s = await users_repo.get_settings(session, user.id)
    await session.commit()
    return s


@router.put("/settings", response_model=SettingsIO, tags=["settings"])
async def put_settings(body: SettingsIO, user: CurrentUser, session: Session):
    s = await users_repo.get_settings(session, user.id)
    for k, v in body.model_dump().items():
        setattr(s, k, v)
    await session.commit()
    return body
