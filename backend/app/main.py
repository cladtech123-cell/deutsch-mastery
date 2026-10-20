import logging
from urllib.parse import urlsplit

from fastapi import APIRouter, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api import auth, catalog, lessons, progress, vocabulary
from app.core.config import settings
from app.core.db import SessionLocal

log = logging.getLogger("deutsch_mastery")
UNSAFE = {"POST", "PUT", "PATCH", "DELETE"}


def create_app() -> FastAPI:
    app = FastAPI(title="Deutsch Mastery API", version="1.0.0", docs_url="/api/docs",
                  openapi_url="/api/openapi.json", redoc_url=None)

    @app.middleware("http")
    async def csrf_and_json_guard(request: Request, call_next):
        if request.method in UNSAFE and request.url.path.startswith("/api/"):
            origin = request.headers.get("origin")
            # browsers always send Origin on cross-site unsafe requests; non-browser clients may omit it.
            # Same-origin (Origin host == Host) is always fine: covers public tunnel URLs not listed in ALLOWED_ORIGINS.
            same_origin = origin and urlsplit(origin).netloc == request.headers.get("host")
            if origin and not same_origin and origin.rstrip("/") not in settings.origins:
                return JSONResponse({"detail": "So'rov manbasiga ruxsat yo'q."}, status_code=403)
            has_body = request.headers.get("content-length", "0") != "0" or "transfer-encoding" in request.headers
            ctype = request.headers.get("content-type", "").split(";")[0].strip().lower()
            if has_body and ctype != "application/json":
                return JSONResponse({"detail": "Faqat application/json qabul qilinadi."}, status_code=415)
        return await call_next(request)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        first = exc.errors()[0] if exc.errors() else {}
        where = ".".join(str(p) for p in first.get("loc", ()) if p not in ("body", "query", "path"))
        return JSONResponse(status_code=422, content={
            "detail": f"Ma'lumot noto'g'ri: {where} — {first.get('msg', '')}".strip(" —:"),
            "errors": [{"loc": e.get("loc"), "msg": e.get("msg"), "type": e.get("type")} for e in exc.errors()],
        })

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception):
        log.exception("unhandled error", exc_info=exc)
        return JSONResponse(status_code=500, content={"detail": "Ichki xatolik yuz berdi. Keyinroq urinib ko'ring."})

    api = APIRouter(prefix="/api")

    @api.get("/health", tags=["health"])
    async def health():
        try:
            async with SessionLocal() as s:
                await s.execute(text("select 1"))
            db = "ok"
        except Exception:  # noqa: BLE001 — health must report, not raise
            db = "error"
        return {"status": "ok", "db": db}

    for r in (auth.router, lessons.router, vocabulary.router, catalog.router, progress.router):
        api.include_router(r)
    app.include_router(api)
    return app


app = create_app()
