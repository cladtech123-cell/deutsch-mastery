"""AIProvider interface + implementations. Keys come only from env (app.core.config)."""
from dataclasses import dataclass
from typing import Protocol

import httpx

from app.core.config import settings


class AIError(Exception):
    pass


@dataclass
class Msg:
    role: str  # "user" | "assistant"
    content: str


class AIProvider(Protocol):
    name: str
    configured: bool

    async def chat(self, system: str, messages: list[Msg], max_tokens: int = 600) -> str: ...


class NoneProvider:
    name = "none"
    configured = False

    async def chat(self, system: str, messages: list[Msg], max_tokens: int = 600) -> str:
        raise AIError("AI provider is not configured")


class OpenAIProvider:
    name = "openai"
    url = "https://api.openai.com/v1/chat/completions"

    def __init__(self, key: str, model: str, transport: httpx.AsyncBaseTransport | None = None):
        self.key, self.model, self.transport = key, model or "gpt-4o-mini", transport
        self.configured = bool(key)

    async def chat(self, system: str, messages: list[Msg], max_tokens: int = 600) -> str:
        body = {"model": self.model, "max_tokens": max_tokens, "temperature": 0.4,
                "messages": [{"role": "system", "content": system},
                             *({"role": m.role, "content": m.content} for m in messages)]}
        async with httpx.AsyncClient(timeout=30, transport=self.transport) as client:
            try:
                r = await client.post(self.url, json=body, headers={"Authorization": f"Bearer {self.key}"})
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"].strip()
            except (httpx.HTTPError, KeyError, IndexError, ValueError) as e:
                raise AIError(f"openai: {type(e).__name__}") from e


class GeminiProvider:
    name = "gemini"

    def __init__(self, key: str, model: str, transport: httpx.AsyncBaseTransport | None = None):
        self.key, self.model, self.transport = key, model or "gemini-2.0-flash", transport
        self.configured = bool(key)

    async def chat(self, system: str, messages: list[Msg], max_tokens: int = 600) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        body = {"systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "model" if m.role == "assistant" else "user", "parts": [{"text": m.content}]}
                             for m in messages],
                "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.4}}
        async with httpx.AsyncClient(timeout=30, transport=self.transport) as client:
            try:
                r = await client.post(url, json=body, headers={"x-goog-api-key": self.key})
                r.raise_for_status()
                parts = r.json()["candidates"][0]["content"]["parts"]
                return "".join(p.get("text", "") for p in parts).strip()
            except (httpx.HTTPError, KeyError, IndexError, ValueError) as e:
                raise AIError(f"gemini: {type(e).__name__}") from e


def get_provider() -> AIProvider:
    if settings.AI_PROVIDER == "openai":
        return OpenAIProvider(settings.OPENAI_API_KEY, settings.AI_MODEL)
    if settings.AI_PROVIDER == "gemini":
        return GeminiProvider(settings.GEMINI_API_KEY, settings.AI_MODEL)
    return NoneProvider()
