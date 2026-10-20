# Qabul — status: accepted with minor defects, v3, muallif: orkestrator.

## Yakuniy holat (Docker qayta ishga tushgandan keyin, 2026-10-20)
- Mustaqil qabul (runtime, acceptance-2 resume): **acceptable with minor defects**. Live tasdiqlangan: to'liq foydalanuvchi yo'li (register → settings → placement → dars to'g'ri/xato + izoh + retry → yakuniy test → review → dashboard o'zgaradi → yozish → gapirish → AI 503 → hisobni o'chirish, barcha qatorlar 0), argon2id, cookie HttpOnly+SameSite=lax, ikki akkaunt o'rtasida kirish yo'q, 123 ta GET'da javob kaliti yo'q, soxta XFF :8080 orqali 429, backend 127.0.0.1 ga bog'langan. C1–C15: C5 dan tashqari hammasi confirmed.
- Shundan keyin tuzatildi: retry endi mavzu ichida avval o'sha ko'nikma, keyin xato turini tanlaydi (`test_retry_prefers_same_skill`: tuzatishdan oldin yiqildi → o'tdi); g-dativ dagi to'rt nuqta.
- Oxirgi yurgizish: `pytest -q` **45 passed**; vitest 29 passed; lint/build exit 0; `playwright test` **4 passed, 2 skipped**; API probe 0 problems; validator 0/0.
- Qolgan (README "Ma'lum cheklovlar"): yozish/gapirish sahifalari ko'nikma foiziga kirmaydi (faqat faollik); to'g'ridan-to'g'ri `127.0.0.1:8001` da XFF ishonchli; dictation matni brauzerga boradi; logout JWT'ni bekor qilmaydi; A1 mashqlarida A2 grammatika teglari.
- Tekshirilmagan: haqiqiy OpenAI/Gemini chaqiruvi, haqiqiy qurilmada TTS/nutqni tanish, toza git clone'dan README (README toza nusxada avvalroq tekshirilgan).

## Oldingi yozuvlar (v2) Kirish: [02-solution.md](02-solution.md)

Barcha natijalar orkestrator tomonidan qayta ishga tushirilgan (ijrochi hisoboti dalil sifatida qabul qilinmagan). Sana: 2026-10-20.

## Muhit
- Docker Engine 29.6.1. Compose loyihasi `deutsch-mastery`: db `127.0.0.1:5433`, backend `:8001`, frontend `:8080`. Foydalanuvchining `dispatcher_*`, `sms_redis` konteynerlariga tegilmagan; reset/prune/`down -v` ishlatilmagan.
- Windows 5097–5196 TCP portlarini band qilgan (Hyper-V/WSL) → 5173 bu mashinada bind qilinmaydi (`EACCES`); Vite tekshiruvlari 5273 da.

## Kontent (birlashtirilgan)
| Tekshiruv | Buyruq | Natija |
|---|---|---|
| Fayllar | `ls content/...` | 24 module.json, 72 dars, 27 grammatika, placement + mid-a1/exam-a1/mid-a2/exam-a2, 12 o'qish |
| Lug'at dublikatlari | `scratchpad/dedupe_vocab.py content --write` | 17 darsda 30 so'z review'ga o'tkazildi; har darsda ≥8 yangi so'z qoldi |
| Validator | `python backend/scripts/validate_content.py` | 140 files parsed; **0 errors, 0 warnings** |
| Mojibake / placeholder | grep | 0 / 0 |
| DB (SQL to'g'ridan-to'g'ri) | `psql` | modules A1 12, A2 12; lessons 72 (har modulda ≥3); grammar 27; exams: placement 1, midterm 2, level_exam 2, module_test 24; exercises active 1947, retired 0, izohsiz 0; vocab 899; writing_tasks 24; reading 12; 17 xil mashq turi |
| Seed idempotentligi | `python -m scripts.seed --demo` ×2 | ikki marta bir xil sonlar, `retired_now=0`, WARN 0 |
| API orqali to'liq probe | `scratchpad/content_api_probe.py` (haqiqiy stack, :8001) | 72/72 dars ochiladi, 72/72 yakuniy test kalit javoblar bilan 100%, 28/28 imtihon/modul testi 100%, 1045 mashq `/check` orqali to'g'ri, 27 grammatika, 12 o'qish, javob kalitlari sizmaydi; placement: 100% → A2 m19, 0% → A1 m1. **0 problems** |
| Kontent regressiya testi | `pytest tests/test_content.py` | 4 passed (eski m14 xatosini ushlashi tasdiqlangan) |

## Testlar (to'liq kontent bilan)
| Tekshiruv | Buyruq | Natija |
|---|---|---|
| Backend pytest (real Postgres) | `cd backend && python -m pytest -q` | **43 passed** (39 + 4 kontent) |
| Frontend lint | `npx oxlint --deny-warnings src e2e` | exit 0 |
| Frontend build | `npm run build` | exit 0 (bundle ~520 kB ogohlantirish) |
| Vitest | `npx vitest run` | 4 files, **29 passed** |
| Playwright e2e | `npx playwright test` (stack :8080) | **4 passed, 2 skipped** (skip — mobil testlar desktop loyihasida yurmaydi) |
| Origin | curl, 4 manba | localhost/127.0.0.1 × 5173/8080 → o'tadi; evil.example → 403 |

## README tekshiruvi (toza nusxa)
`node_modules`/`.env`siz nusxa, `cp .env.example .env` + placeholderlar, portlar 5434/8011/8090 (README §10 bo'yicha), `docker compose -p dm-readme up -d --build` (asl `deutsch-mastery` stack'iga tegmaslik uchun `-p`):
health ok, `/api/docs` 200, demo login 200; `pip install -r requirements.txt` ok; `alembic upgrade head` ok; `seed --demo` 72/24/27/29; `validate_content.py` 0/0; `export_content out.json` 3.4 MB; pytest 43 passed; `npm ci` ok; lint 0; build ok; vitest 29 passed; `E2E_BASE_URL=http://localhost:8090 npx playwright test` 4 passed / 2 skipped. So'ng `docker compose -p dm-readme down` (volume `dm-readme_pgdata` qoldirildi).

## Topilgan va tuzatilgan nuqsonlar
| # | Nuqson | Tuzatish | Dalil (keyin) |
|---|---|---|---|
| 1 | 127.0.0.1:5173/8080 Origin 403 | `ALLOWED_ORIGINS` standarti, `.env`, `.env.example`; test kengaytirildi | pytest yiqildi → o'tdi |
| 2 | Vite faqat `[::1]` → 127.0.0.1 ochilmaydi | `vite.config.ts` host 127.0.0.1 | ikkala host 200 |
| 3 | Sidebar mojibake `A1 в†’ A2` | `Layout.tsx` | grep 0 |
| 4 | compose up'dan keyin nginx 502 | backend healthcheck + `service_healthy` | darhol 200 |
| 5 | m17: "erster Stock = ikkinchi qavat" qoidasi tushuntirilmagan, modul testi esa uni so'raydi | m17-l2 ga tip bloki (v2) | validator 0 |
| 6 | m07: `möchten` partizip2 = `gemocht` (mögen shakli) | `gewollt`/`wollte` + izoh (v2) | validator 0 |
| 7 | m14-l3-e10: mezon "sind" talab qiladi, topshiriq birlikda ("bin") — to'g'ri javob xato baholanardi | required_words `bin`,`haben` (v2) | probe 0, test_content |
| 8 | Port to'qnashuvi uchun sozlanadigan host portlari yo'q edi | `BACKEND_HOST_PORT`, `FRONTEND_HOST_PORT` | toza nusxada 8011/8090 ishladi |

## Mustaqil qabul (acceptance-2, general-purpose agent; acceptance-1 sessiya uzilishida natijasiz qoldi)
Docker ishga tushmadi (Docker Desktop `Docker\run` va `docker-secrets-engine` dagi buzilgan AF_UNIX socketlarda yiqiladi) → runtime qismlari **unverified**. Agent qayta ishga tushirgan: validator 0/0, vitest 29 passed, pytest 19 passed + 24 error (hammasi `ConnectionRefused`, DB yo'q). Verdikt: NOT ACCEPTED YET (runtime tekshirilmagani uchun).
Agent topgan va tuzatilganlar (DB'siz qayta tekshirildi: validator 0/0, `test_unit`+`test_content` 19 passed):
| # | Nuqson | Tuzatish | Holat |
|---|---|---|---|
| 9 | `X-Forwarded-For` soxtalashtirilib auth rate-limit aylanib o'tiladi | nginx `X-Forwarded-For $remote_addr` (qo'shmaydi, almashtiradi); backend porti `127.0.0.1` ga bog'landi | kod; live tekshiruv Docker'dan keyin |
| 10 | Backend barcha interfeyslarda ochiq | `127.0.0.1:${BACKEND_HOST_PORT}` | Docker'dan keyin |
| 11 | Yozish/gapirish streak va haftalik faollikka kirmaydi | `bump_daily` writing.submit va speaking.record da; 2 ta API test qo'shildi | testlar DB'ni kutmoqda |
| 12 | Kontent: m17 hint javobni aytadi, "pikinik", 4 ta qabul qilinmaydigan to'g'ri javob, -er ko'plik izohi, exam-a1-24 "Zimmer" talabi, g-dativ misol tartibi | 9 faylda tuzatildi (versiyalar oshirildi) | validator 0/0, test_content o'tdi |
Qabul qilinmagan (cheklov sifatida README'da): dictation matni brauzerga boradi; logout JWT'ni bekor qilmaydi; A1 m09–m10 mashqlari A2 grammatika mavzulari bilan belgilangan; eski Lesebuch fayllari (`index.html`, `logic.js`, `test.js`, `texts.js`) ildizda qoldirildi (foydalanuvchining oldingi ishi).

## Hali tekshirilmagan / ochiq
- Nemischa/o'zbekcha matnning til sifati faqat namuna bo'yicha (qabul agenti) — 1947 mashqning har biri inson tomonidan o'qilmagan.
- Haqiqiy OpenAI/Gemini chaqiruvi yo'q (faqat mock); TTS va SpeechRecognition haqiqiy qurilmada tinglanmagan.
- Mustaqil qabul agenti — kutilmoqda.
