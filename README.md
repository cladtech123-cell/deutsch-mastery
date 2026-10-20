# Deutsch Mastery

Nemis tilini noldan A1 orqali A2 gacha o'rgatadigan, tushuntirishlari o'zbek tilida bo'lgan web-platforma.
Arxitektura, ma'lumotlar modeli, API va kontent formati: [PROJECT_PLAN.md](PROJECT_PLAN.md). Backend tafsilotlari:
[backend/README_BACKEND.md](backend/README_BACKEND.md).

- **Kurs:** 24 modul (A1: 12, A2: 12), 72 dars, 27 grammatika mavzusi, 899 so'z, 1947 mashq (17 tur).
- **Testlar:** diagnostik test, 24 modul testi, A1/A2 oraliq va sinov imtihonlari, 12 o'qish matni.
- **Funksiyalar:** dars oqimi (tushuntirish → lug'at → grammatika → tinglash → mashqlar → real vaziyat → yakuniy test →
  xatolar tahlili), SM-2 takrorlash, progress va dashboard, yozish, gapirish, AI tutor (ixtiyoriy).
- **Stack:** React 19 + Vite + TypeScript (strict), TanStack Query, Zustand, Tailwind v4 · FastAPI, SQLAlchemy 2 (async),
  Alembic, PostgreSQL 17 · Docker Compose.

> Bu platformadagi test natijalari ichki baho. Ular Goethe, telc yoki boshqa rasmiy sertifikat o'rnini bosmaydi.

## 1. Kerakli dasturlar
- Docker Desktop (Compose v2) — to'liq ishga tushirish uchun yetarli.
- Lokal ishlab chiqish va testlar uchun: Python 3.13, Node.js 22+ (npm).

## 2. O'rnatish
```bash
git clone <repo-url> deutsch-mastery
cd deutsch-mastery
```

## 3. `.env` yaratish
```bash
cp .env.example .env
```
`.env` ichidagi har bir `<change-me-...>` ni almashtiring (`POSTGRES_PASSWORD` uch joyda bir xil bo'lsin). JWT kaliti:
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```
Demo foydalanuvchi kerak bo'lsa `DEMO_PASSWORD` ni to'ldiring: `demo@deutsch-mastery.local` shu parol bilan yaratiladi.
`.env` hech qachon repositoriyga qo'shilmaydi (`.gitignore`).

## 4. Docker orqali ishga tushirish
```bash
docker compose up -d --build
docker compose ps
```
Backend sog'lom (`healthy`) bo'lgach frontend ishga tushadi. Manzillar (standart portlar):

| Xizmat | Manzil |
|---|---|
| Ilova | http://localhost:8080 |
| API | http://localhost:8001/api (nginx orqali ham: http://localhost:8080/api) |
| API hujjatlari (OpenAPI) | http://localhost:8001/api/docs |
| PostgreSQL | `127.0.0.1:5433` (faqat shu kompyuterdan) |

Tekshirish:
```bash
curl http://localhost:8080/api/health
```
Javob: `{"status":"ok","db":"ok"}`.

## 5–6. Baza, migratsiyalar va seed
Backend konteyneri har ishga tushganda avtomatik bajaradi: `alembic upgrade head` → `python -m scripts.seed` → uvicorn.
Seed idempotent: kontentni ID bo'yicha yangilaydi, hech narsani o'chirmaydi (fayldan olib tashlangan mashq `retired`
bo'ladi, foydalanuvchi urinishlari saqlanadi).

Qo'lda, host'dan (`.env` dagi `DATABASE_URL` ishlatiladi; DB konteyneri ishlab turishi kerak):
```bash
cd backend
pip install -r requirements.txt
python -m alembic upgrade head
python -m scripts.seed --demo
python scripts/validate_content.py
```
Kontentni bazadan JSON'ga eksport qilish: `python -m scripts.export_content out.json`.

## 7. Testlar
Backend (`TEST_DATABASE_URL` — alohida test bazasi; testlar uning `public` sxemasini qayta yaratadi, haqiqiy
ma'lumotga hech qachon yo'naltirmang):
```bash
cd backend
python -m pytest -q
```
Frontend:
```bash
cd frontend
npm ci
npm run lint
npm run build
npm run test
```
End-to-end (ishlab turgan stack'ga qarshi, API soxtalashtirilmaydi; desktop va 375x812 loyihalari):
```bash
cd frontend
npx playwright install chromium
npx playwright test
```
Boshqa manzil uchun: `E2E_BASE_URL=http://localhost:8080 npx playwright test`.

## 8. AI xizmatini sozlash
`.env` da:
```
AI_PROVIDER=openai        # yoki gemini
OPENAI_API_KEY=...        # yoki GEMINI_API_KEY=...
AI_MODEL=                 # bo'sh: gpt-4o-mini / gemini-2.0-flash
AI_DAILY_LIMIT=30         # foydalanuvchiga kunlik AI so'rovlar soni
```
So'ng `docker compose up -d backend`. API kalitlari faqat backendda saqlanadi, frontendga hech qachon yuborilmaydi.

## 9. AI'siz rejim
`AI_PROVIDER=none` (standart). Kurs, lug'at, takrorlash, testlar, yozish va gapirish to'liq ishlaydi.
AI tutor sahifasi "AI sozlanmagan" xabarini ko'rsatadi (`/api/ai/tutor` → 503).

## 10. Muammolarni tekshirish
- **Port band** (masalan 5432/8000 boshqa loyihada): `.env` da `POSTGRES_HOST_PORT`, `BACKEND_HOST_PORT`,
  `FRONTEND_HOST_PORT` ni o'zgartiring. Frontend porti o'zgarsa, yangi manzilni `ALLOWED_ORIGINS` ga qo'shing,
  aks holda POST so'rovlari 403 ("So'rov manbasiga ruxsat yo'q") qaytaradi.
- **Windows'da `npm run dev` → `EACCES 5173`:** Hyper-V/WSL ba'zi port oraliqlarini band qiladi
  (`netsh interface ipv4 show excludedportrange protocol=tcp`). Boshqa port ishlating:
  `npm run dev -- --port 5273` va `http://127.0.0.1:5273` ni `ALLOWED_ORIGINS` ga qo'shing.
  Dev rejimda `/api` → `http://127.0.0.1:8001` ga proksi qilinadi (backend Docker'da ishlab turishi kerak).
- **Backend `unhealthy` / 502:** `docker compose logs backend` — odatda `.env` dagi parol mos kelmasligi yoki seed xatosi
  (seed noto'g'ri kontent faylida to'xtaydi va qaysi fayl ekanini yozadi).
- **Kontent xatosi:** `python backend/scripts/validate_content.py` — 0 error bo'lishi kerak.

## 11. Production'ga joylashtirish
- `.env`: `ENV=production` (cookie `Secure` bo'ladi), kuchli `JWT_SECRET` va DB paroli, `ALLOWED_ORIGINS` = haqiqiy domen,
  `DEMO_PASSWORD` bo'sh.
- Frontend'ni HTTPS orqali (reverse proxy yoki load balancer) bering; backend porti va PostgreSQL tashqariga ochilmasin.
- PostgreSQL ma'lumotlari `pgdata` volume'ida — muntazam zaxira (`pg_dump`) qiling.
- Rate limiter va AI kunlik limiti xotirada saqlanadi: bir nechta backend nusxasida ular har nusxa uchun alohida ishlaydi.

## Ma'lum cheklovlar
- TTS va nutqni tanish brauzerning Web Speech API'siga bog'liq: nemis ovozi bo'lmasa, interfeys "audio mavjud emas" deydi.
  Chrome'da SpeechRecognition ovozni Google serveriga yuborishi mumkin (gapirish sahifasida aytilgan). Platformaning o'zi
  ovoz yozuvini serverga yubormaydi.
- Talaffuz aniq baholanmaydi: faqat tanilgan matn bilan maqsad matn so'zma-so'z taqqoslanadi.
- Haqiqiy OpenAI/Gemini API'si testlarda chaqirilmagan (faqat so'rov shakli tekshirilgan).
- Diagnostik test qat'iy (adaptiv emas); tavsiya foiz oraliqlari bo'yicha beriladi.
- Frontend bundle bitta fayl (~520 kB); code-splitting qilinmagan.
- Diktant (dictation) savollarida matn brauzer TTS'iga kerak bo'lgani uchun brauzerga yuboriladi: devtools orqali
  testdagi diktant javobini ko'rish mumkin. Server tomonida audio yaratilsa tuzaladi.
- Chiqish (logout) cookie'ni o'chiradi, lekin JWT 7 kun amal qiladi (token bekor qilish ro'yxati yo'q).
- Rate limit nginx (`:8080`) orqali to'g'ri ishlaydi; backend'ning to'g'ridan-to'g'ri porti (`127.0.0.1:8001`) faqat shu
  kompyuterdan ochiq va u yerda `X-Forwarded-For` ishonchli hisoblanadi.
- A1 m09–m10 da "mit dem Bus", "in der Küche" kabi Dativ iboralari tayyor qolip sifatida beriladi; bu mashqlar
  A2 grammatika mavzulari (`g-place-prepositions`, `g-dativ`) bilan belgilangan.
- Erkin yozish va gapirish sahifalari kunlik faollik va streak'ka kiradi; ko'nikma foizlari esa darslardagi
  yozish/gapirish mashqlaridan hisoblanadi.
