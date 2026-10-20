# Yechim — status: draft v1 (tanqidchi kutilmoqda), muallif: orkestrator
Kirish: [01-request.md](01-request.md). Arxitektura, ma'lumotlar modeli, API va kontent formati — [PROJECT_PLAN.md](../../PROJECT_PLAN.md) (shartnoma, takrorlanmaydi).

## Talablar (C*) — promptning §26 qabul mezonlari
| C | Mezon | Tekshiruv |
|---|---|---|
| C1 | Frontend va backend ishga tushadi | `docker compose up` + /api/health; `npm run build` |
| C2 | DB va Alembic migratsiyalari toza bazaga qo'llanadi | pytest `test_migrations` |
| C3 | 24 modul, ≥72 mazmunli dars, placeholder yo'q | `validate_content.py` 0 error; schema min uzunliklar |
| C4 | O'zbekcha tushuntirish + nemischa misollar | schema majburiy maydonlar; qabul agenti tanlab tekshiradi |
| C5 | Mashqlar javobni tekshiradi va izoh beradi (+retry) | pytest grading/check; e2e |
| C6 | Lug'at va SRS (SM-2, kunlik limit) | pytest srs; e2e review |
| C7 | Progress bazada saqlanadi, dashboard real ma'lumotdan | pytest progress; e2e dashboard |
| C8 | O'qish va tinglash topshiriqlari (TTS adapter, halol fallback) | UI + kontent |
| C9 | Yozish va gapirish oqimlari | pytest writing/speaking; UI |
| C10 | AI tutor: provider interfeysi, kalitsiz holatda 503 + aniq xabar; kalit frontendda yo'q | pytest ai; grep frontend |
| C11 | A1/A2 sinov imtihonlari va diagnostika | kontent + pytest exams |
| C12 | Mobil dizayn tekshirilgan | 375px skrinshot |
| C13 | Backend, frontend, e2e testlar o'tadi | pytest, vitest, playwright chiqishi |
| C14 | README va .env.example to'liq, buyruqlar haqiqatan tekshirilgan | qabul agenti README bo'yicha ishga tushiradi |
| C15 | Xavfsizlik: argon2id, httpOnly cookie, o'z ma'lumotiga kirish, hisobni o'chirish, rate limit | pytest authz |

Baseline: bo'sh papka; faqat oldingi Lesebuch A2 (statik, 6 matn) bor.

## Tanlov
Stack foydalanuvchi tomonidan belgilangan (D1). Haqiqiy tanlovlar va sabablari — PROJECT_PLAN §3 (D2–D10).
Ijro rejasi (parallel, fayl egalari ajratilgan):
| Ijrochi | Yozadi | Bog'liqlik |
|---|---|---|
| backend | `backend/**` (content_schema.py va validate_content.py dan tashqari), `docker-compose.yml`, `.env.example` | PROJECT_PLAN §4, §6 |
| frontend | `frontend/**` | PROJECT_PLAN §6, §7 |
| content-1 | `content/a1/m01..m06` (l1 andoza bor) | §5, andoza dars |
| content-2 | `content/a1/m07..m12` | §5 |
| content-3 | `content/a2/m13..m18` | §5 |
| content-4 | `content/a2/m19..m24` | §5 |
| content-5 | `content/grammar/*`, `content/placement.json`, `content/exams/*`, `content/reading/*` | §5 |
Orkestrator: shartnoma, README, birlashtirish, e2e.

## Asosiy xavflar
1. Docker daemon ishlamasa — PostgreSQL yo'q → testlar va C1/C2/C13 bloklanadi. Holat: Docker Desktop ishga tushirilmoqda.
2. Parallel kontent agentlari lug'at ID'larini takrorlaydi → validator ogohlantiradi, seed birinchisini oladi, qabulda tozalanadi.
3. Frontend va backend API shartnomasidan chetga chiqadi → ikkalasi ham faqat §6 dan ishlaydi; e2e real backendda.
4. Hajm: promptning to'liq doirasi 45 daqiqalik deep limitdan ko'p — limit tugasa bajarilgan ish, qoldiq va aniq davom ettirish indeksda yoziladi.
