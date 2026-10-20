"""AI tutor (request §14) and AI writing feedback, with per-user daily cap."""
import uuid
from datetime import UTC, datetime, time

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import ratelimit
from app.core.config import settings
from app.models import AITutorMessage, User, WritingSubmission
from app.repositories import users as users_repo
from app.repositories.progress import today
from app.schemas.progress import TutorOut
from app.services.ai.providers import AIError, AIProvider, Msg
from app.services.progress import weak_topics

HISTORY = 10
HISTORY_CHARS = 1000

TUTOR_PROMPT = """Sen "Deutsch Mastery" platformasining nemis tili o'qituvchisisan. O'quvchi o'zbek tilida so'zlashadi.
O'quvchi darajasi: {level}. Zaif mavzulari: {weak}.

Qoidalar:
1. O'quvchi A1 bo'lsa, asosan A1 so'zlari va grammatikasidan foydalan; A2 bo'lsa A2 dan oshma.
2. Yangi grammatikani avval sodda o'zbek tilida tushuntir.
3. Har bir nemischa jumlaga qisqa o'zbekcha izoh yoki tarjima qo'sh.
4. O'quvchi xato qilsa, masxara qilmasdan va faqat "noto'g'ri" demasdan tuzat: to'g'ri shaklni, sababini va qoidani ayt.
5. Mumkin bo'lsa, o'quvchini javobni o'zi topishga yo'naltir (savol yoki ishora bilan).
6. Ishonching komil bo'lmagan ma'lumotni haqiqat sifatida aytma — "aniq emas, tekshirib ko'ring" de.
7. Har doim o'quvchi darajasini hisobga ol.
8. Javoblaring qisqa bo'lsin (odatda 3–8 qator).
9. Mashq yoki rolli dialog davomida asosiy mavzudan chalg'ima.
10. O'quvchining zaif mavzulari ma'lum bo'lsa, shularga mos qo'shimcha mashq taklif qil.
Faqat oddiy matn yoz (HTML yoki kod yozma). Nemis tilidan boshqa mavzudagi so'rovlarni muloyimlik bilan nemis tiliga qaytar."""

WRITING_PROMPT = """Sen nemis tili o'qituvchisisan. O'quvchi ({level}) quyidagi yozma topshiriqni bajardi: "{task}".
O'quvchi matnini o'zgartirmasdan tahlil qil. Har bir xato uchun: asl bo'lak → tuzatilgan shakl — sabab (o'zbekcha, qisqa).
Oxirida yaxshilangan to'liq variantni ber. Darajadan yuqori so'z ishlatma. Faqat oddiy matn yoz."""


async def used_today(session: AsyncSession, user: User) -> int:
    start = datetime.combine(today(), time.min, tzinfo=UTC)
    msgs = await session.scalar(select(func.count()).where(
        AITutorMessage.user_id == user.id, AITutorMessage.role == "user", AITutorMessage.created_at >= start)) or 0
    feedback = await session.scalar(select(func.count()).where(
        WritingSubmission.user_id == user.id, WritingSubmission.ai_feedback.is_not(None),
        WritingSubmission.created_at >= start)) or 0
    return msgs + feedback


async def _guard(session: AsyncSession, user: User, provider: AIProvider) -> None:
    if not provider.configured:
        raise HTTPException(503, "AI tutor sozlanmagan. Kursning qolgan barcha qismlari odatdagidek ishlaydi.")
    ratelimit.hit(f"ai:{user.id}", settings.AI_RATE_PER_MINUTE)
    if await used_today(session, user) >= settings.AI_DAILY_LIMIT:
        raise HTTPException(429, "Bugungi AI so'rovlari limiti tugadi. Ertaga davom eting.")


async def tutor(session: AsyncSession, user: User, provider: AIProvider, message: str,
                session_id: uuid.UUID | None) -> TutorOut:
    await _guard(session, user, provider)
    level = (await users_repo.get_settings(session, user.id)).current_level
    weak = ", ".join(w.topic for w in await weak_topics(session, user)) or "hali aniqlanmagan"
    sid = session_id or uuid.uuid4()
    history = (await session.scalars(
        select(AITutorMessage).where(AITutorMessage.user_id == user.id, AITutorMessage.session_id == sid)
        .order_by(AITutorMessage.created_at.desc(), AITutorMessage.id.desc()).limit(HISTORY))).all()
    msgs = [Msg(m.role, m.content[:HISTORY_CHARS]) for m in reversed(history)] + [Msg("user", message)]
    try:
        reply = await provider.chat(TUTOR_PROMPT.format(level=level, weak=weak), msgs)
    except AIError:
        raise HTTPException(502, "AI xizmati hozir javob bermadi. Birozdan keyin qayta urinib ko'ring.") from None
    session.add_all([AITutorMessage(user_id=user.id, session_id=sid, role="user", content=message),
                     AITutorMessage(user_id=user.id, session_id=sid, role="assistant", content=reply)])
    await session.commit()
    return TutorOut(session_id=sid, reply=reply)


async def writing_feedback(session: AsyncSession, user: User, provider: AIProvider, task: str,
                           text: str) -> dict | None:
    """Best effort: None when AI is off, over the cap or failing — writing checks still work without it."""
    if not provider.configured or await used_today(session, user) >= settings.AI_DAILY_LIMIT:
        return None
    level = (await users_repo.get_settings(session, user.id)).current_level
    try:
        reply = await provider.chat(WRITING_PROMPT.format(level=level, task=task), [Msg("user", text)], 800)
    except AIError:
        return None
    return {"provider": provider.name, "text": reply}
