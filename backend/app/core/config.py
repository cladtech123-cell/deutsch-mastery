from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    # real env vars win over both files; repo-root .env serves host-side runs from backend/
    model_config = SettingsConfigDict(env_file=(ROOT / ".env", ".env"), extra="ignore")

    ENV: Literal["development", "test", "production"] = "development"
    DATABASE_URL: str = "postgresql+asyncpg://deutsch:deutsch@localhost:5432/deutsch"
    TEST_DATABASE_URL: str = ""  # pytest only
    JWT_SECRET: str = "dev-insecure-secret-change-me"
    JWT_EXPIRE_DAYS: int = 7
    ALLOWED_ORIGINS: str = "http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173"
    AUTH_RATE_PER_MINUTE: int = 10
    AI_PROVIDER: Literal["none", "openai", "gemini"] = "none"
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    AI_MODEL: str = ""
    AI_DAILY_LIMIT: int = 30
    AI_RATE_PER_MINUTE: int = 10
    CONTENT_DIR: Path = ROOT / "content"
    DEMO_PASSWORD: str = ""

    @property
    def origins(self) -> set[str]:
        return {o.strip().rstrip("/") for o in self.ALLOWED_ORIGINS.split(",") if o.strip()}


settings = Settings()

if settings.ENV == "production" and settings.JWT_SECRET.startswith("dev-insecure"):
    raise RuntimeError("JWT_SECRET must be set in production")
