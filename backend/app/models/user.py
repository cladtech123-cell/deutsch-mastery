import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, created_at


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("email = lower(email)", name="email_lower"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(80))
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = created_at()


class UserSettings(Base):
    __tablename__ = "user_settings"
    __table_args__ = (
        CheckConstraint("current_level in ('A1','A2')", name="level"),
        CheckConstraint("start_module between 1 and 24", name="start_module"),
        CheckConstraint("daily_minutes in (15,30,45,60)", name="daily_minutes"),
        CheckConstraint("goal in ('daily','living','study','ausbildung','work','general')", name="goal"),
        CheckConstraint("weekly_goal_days between 1 and 7", name="weekly_goal_days"),
        CheckConstraint("new_per_day between 1 and 50", name="new_per_day"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    current_level: Mapped[str] = mapped_column(String(2), default="A1", server_default="A1")
    start_module: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    daily_minutes: Mapped[int] = mapped_column(Integer, default=30, server_default="30")
    goal: Mapped[str] = mapped_column(String(20), default="general", server_default="general")
    weekly_goal_days: Mapped[int] = mapped_column(Integer, default=5, server_default="5")
    reminders_enabled: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    new_per_day: Mapped[int] = mapped_column(Integer, default=15, server_default="15")
    onboarding_done: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
