import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_RE = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class RegisterIn(BaseModel):
    email: str = Field(max_length=254, pattern=EMAIL_RE)
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=80)

    @field_validator("email", mode="before")
    @classmethod
    def _lower(cls, v: object) -> object:
        return v.strip().lower() if isinstance(v, str) else v

    @field_validator("display_name")
    @classmethod
    def _strip(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Ism bo'sh bo'lmasligi kerak")
        return v.strip()


class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def _lower(cls, v: object) -> object:
        return v.strip().lower() if isinstance(v, str) else v


class DeleteMeIn(BaseModel):
    password: str = Field(max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    display_name: str
    is_demo: bool


class SettingsIO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    current_level: Literal["A1", "A2"]
    start_module: int = Field(ge=1, le=24)
    daily_minutes: Literal[15, 30, 45, 60]
    goal: Literal["daily", "living", "study", "ausbildung", "work", "general"]
    weekly_goal_days: int = Field(ge=1, le=7)
    reminders_enabled: bool
    new_per_day: int = Field(ge=1, le=50)
    onboarding_done: bool
