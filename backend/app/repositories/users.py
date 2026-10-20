import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, UserSettings


async def get_by_email(session: AsyncSession, email: str) -> User | None:
    return await session.scalar(select(User).where(User.email == email.lower()))


async def create(session: AsyncSession, email: str, password_hash: str, display_name: str,
                 is_demo: bool = False) -> User:
    user = User(email=email.lower(), password_hash=password_hash, display_name=display_name, is_demo=is_demo)
    session.add(user)
    await session.flush()
    session.add(UserSettings(user_id=user.id))
    await session.flush()
    return user


async def get_settings(session: AsyncSession, user_id: uuid.UUID) -> UserSettings:
    s = await session.get(UserSettings, user_id)
    if s is None:  # users created before settings existed, or by hand
        s = UserSettings(user_id=user_id)
        session.add(s)
        await session.flush()
        await session.refresh(s)
    return s


async def delete_user(session: AsyncSession, user_id: uuid.UUID) -> None:
    await session.execute(delete(User).where(User.id == user_id))  # every user table cascades
