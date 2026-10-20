# Deutsch Mastery — PROJECT_PLAN

Status: v2 (2026-10-20, tanqidchi tuzatishlari kiritilgan). Manba: foydalanuvchi prompti ([.make-feature/deutsch-mastery/01-request.md](.make-feature/deutsch-mastery/01-request.md)).
Bu hujjat — barcha ijrochilar uchun yagona shartnoma: papkalar, ma'lumotlar modeli, API, kontent formati. O'zgartirish faqat orkestrator orqali.

## 1. Repository holati
Bo'sh papka (git yo'q). Oldingi sessiyadan `index.html`/`texts.js` (Lesebuch A2 — 6 ta A2 o'qish matni + lug'at) bor: ular `content/reading/` ga ko'chiriladi va o'qish bo'limida qayta ishlatiladi.

## 2. Arxitektura
```
browser ──> frontend (React+Vite, nginx in Docker) ──/api──> backend (FastAPI, uvicorn)
                                                              │  services → repositories → SQLAlchemy async
                                                              └─> PostgreSQL 17
content/*.json  ──(scripts/seed.py, pydantic validatsiya, idempotent upsert)──> PostgreSQL
AI provider (ixtiyoriy, env orqali) <── backend/app/services/ai/  (kalit faqat backendda)
TTS: brauzer Web Speech API (de-DE) adapteri; ovoz bo'lmasa UI "audio mavjud emas" deydi.
Speech-to-text: brauzer SpeechRecognition (bor bo'lsa); yo'q bo'lsa — yozib olish + o'zini baholash.
```

### Papkalar
```
PROJECT_PLAN.md  README.md  .env.example  .gitignore  docker-compose.yml
backend/
  Dockerfile  requirements.txt  alembic.ini  alembic/  pytest.ini
  app/
    main.py                 # create_app(), routerlarni ulash, xato handlerlari
    core/config.py          # pydantic-settings: DATABASE_URL, JWT_SECRET, AI_PROVIDER, ...
    core/db.py              # async engine, session dependency
    core/security.py        # argon2id hash, JWT cookie, current_user dependency
    core/ratelimit.py       # oddiy in-memory limiter (auth endpointlar)
    content_schema.py       # kontent JSON pydantic modellari (YAGONA manba, §5)
    models/                 # SQLAlchemy 2.x modellar (fayl bo'yicha domen)
    schemas/                # API pydantic request/response
    repositories/
    services/               # grading.py, srs.py, progress.py, placement.py, writing.py, ai/
    api/                    # routers: auth, settings, curriculum, lessons, exercises, vocabulary,
                            #          review, grammar, placement, exams, reading, writing, speaking, progress, ai
  scripts/seed.py  scripts/validate_content.py  scripts/export_content.py
  tests/
content/
  a1/m01/module.json  a1/m01/l1.json l2.json l3.json   ... a1/m12/
  a2/m13/ ... a2/m24/
  grammar/<topic_id>.json
  placement.json  exams/a1.json  exams/a2.json
  reading/<id>.json
frontend/
  Dockerfile  nginx.conf  package.json  vite.config.ts  tsconfig*.json  index.html
  src/{api,components,features,pages,store,lib}/  src/test/  e2e/  playwright.config.ts
```

## 3. Qarorlar (D*)
| ID | Qaror | Sabab |
|---|---|---|
| D1 | Stack — promptdagi kabi (React/Vite/TS strict, Router, TanStack Query, Zustand, axios, Tailwind v4, lucide; FastAPI, Pydantic v2, SQLAlchemy 2 async + asyncpg, Alembic, PostgreSQL 17) | Foydalanuvchi talabi |
| D2 | Auth: JWT (HS256, 7 kun) **httpOnly cookie** `dm_session`, SameSite=Lax, Secure prod'da; parol Argon2id (`argon2-cffi`) | Token JS'ga ko'rinmaydi (XSS'dan himoya). JSON-only API + Lax cookie — CSRF xavfi past; state o'zgartiruvchi so'rovlarda `Origin` tekshiriladi |
| D3 | Kurs kontenti — `content/` dagi JSON fayllar (dars bo'yicha), `content_schema.py` bilan validatsiya, `seed.py` idempotent upsert | Kontent koddan ajralgan, versiyalanadi, import/eksport oson |
| D4 | Barqaror ID: `a1-m01-l1`, `a1-m01-l1-e03`, `v-<lemma>`; har obyektda `version`. Urinishlar `exercise_id + exercise_version` saqlaydi | Kontent yangilanganda tarix buzilmaydi |
| D5 | Dars matni (tushuntirish, dialog) `lessons.sections` JSONB (pydantic bilan tekshirilgan); so'rov qilinadigan narsalar (lug'at, mashqlar, grammatika) — alohida jadvallar | JSON faqat strukturali va o'qish uchun; statistika jadvallardan |
| D6 | Javobni tekshirish faqat backendda; dars API'si javob kalitlarini qaytarmaydi | Haqiqiy baholash, aldash qiyin |
| D7 | SRS: SM-2 (backend), kuniga yangi kartalar ≤ `new_per_day` (standart 15), takrorlash ≤ 100 | Prompt §11 |
| D8 | Ovoz yozuvlari serverga yuborilmaydi: brauzerda qoladi; serverga faqat tanilgan matn, maqsad matn va o'z bahosi | Maxfiylik; saqlash siyosati sodda |
| D9 | AI: `AIProvider` interfeysi (`openai`, `gemini`, `none`); `AI_PROVIDER=none` standart, kurs to'liq ishlaydi | Prompt §4, §14 |
| D10 | Testlar haqiqiy PostgreSQL'da (`TEST_DATABASE_URL`, docker compose'dagi db) | Prompt §23: soxta API yo'q |

## 4. Ma'lumotlar modeli (PostgreSQL)
Barcha vaqtlar `timestamptz` (UTC). Kontent jadvallari: PK — barqaror matn ID.

**Foydalanuvchi**
- `users` (id uuid PK, email lower-case unique, password_hash, display_name, is_demo bool, is_admin bool, created_at)
- `user_settings` (user_id PK FK→users ON DELETE CASCADE, current_level CHECK in ('A1','A2'), start_module int, daily_minutes CHECK in (15,30,45,60), goal CHECK in ('daily','living','study','ausbildung','work','general'), weekly_goal_days CHECK 1..7, reminders_enabled bool, new_per_day int, onboarding_done bool, updated_at)

**Kontent**
- `levels` (code PK 'A1'/'A2', title, order)
- `modules` (id PK 'a1-m01', level FK, number int unique, title, title_de, goals jsonb, writing_task jsonb null, version, content_hash)
- `lessons` (id PK 'a1-m01-l1', module_id FK, order, title, title_de, goal, skill_focus jsonb, sections jsonb, version, content_hash; unique(module_id, order))
- `vocabulary_items` (id PK 'v-...', de, uz, pos, article, plural, forms jsonb, example_de, example_uz, level, topic, first_lesson_id FK null; index(topic), index(level))
- `lesson_vocabulary` (lesson_id, vocab_id, is_review; PK both)
- `grammar_topics` (id PK 'g-...', level, order, title, prerequisites jsonb, next jsonb, body jsonb, version)
- `lesson_grammar` (lesson_id, topic_id; PK both)
- `exercises` (id PK, version, retired bool default false, level, module_id null, lesson_id null, owner_kind CHECK in ('lesson','final','module_test','grammar','placement','exam','reading'), owner_id, section null, skill, topic, grammar_topic null, difficulty 1..3, question_type, question, prompt_de, options jsonb, pairs jsonb, correct_answer jsonb, accepted_answers jsonb, criteria jsonb, hint, explanation, error_type, points, audio_text, order; index(owner_kind, owner_id), index(topic))
- `reading_texts` (id PK, level, title, title_uz, body, glossary jsonb, version) — savollari `exercises` (owner_kind 'reading')
- `exams` (id PK: 'placement', 'mid-a1', 'exam-a1', 'mid-a2', 'exam-a2', 'mtest-a1-m01' …; kind CHECK in ('placement','midterm','module_test','level_exam'), level, title, pass_percent)
- `writing_tasks` (id PK 'w-a1-m01', module_id FK, level, title, task_uz, required_words jsonb, min_words, max_words, criteria jsonb, sample_answer)

**Progress**
- `exercise_attempts` (id bigserial, user_id FK cascade, exercise_id FK, exercise_version, exam_attempt_id FK null, context CHECK in ('lesson','final','module_test','exam','placement','grammar','reading','practice'), skill, topic, grammar_topic null (urinish paytidagi nusxa), answer jsonb, is_correct, points, error_type, created_at; index(user_id, created_at), index(user_id, exercise_id))
- `lesson_progress` (user_id, lesson_id PK both; status CHECK in ('started','completed'), best_score, last_score, attempts, started_at, completed_at)
- `review_cards` (id, user_id FK cascade, vocab_id FK, unique(user_id, vocab_id); saved bool (lug'atda ko'rinadi; olib tashlash kartani o'chirmaydi), ease default 2.5, interval_days, repetitions, due_at, last_reviewed_at, correct_count, wrong_count, lapses, state CHECK in ('new','learning','review','mastered'), source CHECK in ('lesson','manual'), created_at; index(user_id, due_at)) — "foydalanuvchi lug'ati" ham shu
- `review_logs` (id, card_id FK cascade, user_id, quality 0..5, prev_interval, new_interval, created_at)
- `exam_attempts` (id, user_id, exam_id FK, score, total, percent, passed, by_skill jsonb, created_at)
- `placement_results` (id, user_id, score_by_skill jsonb, percent, recommended_level, recommended_module, created_at)
- `writing_submissions` (id, user_id, task_id FK→writing_tasks, text, word_count, checks jsonb, ai_feedback jsonb null, created_at)
- `speaking_attempts` (id, user_id, exercise_id null, target_text, recognized_text null, similarity null, self_rating 1..5 null, created_at)
- `daily_activity` (user_id, day date; PK both; exercises_done, correct, minutes)
- `ai_tutor_messages` (id, user_id, session_id uuid, role CHECK in ('user','assistant'), content, created_at)

Seed hech qachon kontentni o'chirmaydi: fayldan yo'qolgan mashq `retired=true` bo'ladi (urinishlar tarixi saqlanadi).
`module_progress` va ko'nikma progressi saqlanmaydi — `exercise_attempts`/`lesson_progress` dan hisoblanadi (dublikat holat yo'q).

## 5. Kontent formati (`backend/app/content_schema.py` — yagona manba)
Har dars fayli (`content/a1/m01/l1.json`):
```json
{
  "id": "a1-m01-l1", "version": 1, "level": "A1", "module": 1, "order": 1,
  "title": "Salomlashish", "title_de": "Begrüßung",
  "goal": "Dars oxirida ... qila olasiz.",
  "skill_focus": ["vocabulary", "speaking"],
  "explanation": [ {"type": "p", "text": "..."}, {"type": "table", "headers": ["..."], "rows": [["..."]]}, {"type": "tip", "text": "..."} ],
  "vocabulary": [ <Vocab> 8–15 ta ],
  "review_vocabulary": ["v-..."],
  "grammar": [ {"topic_id": "g-sein", "rule": "...", "when": "...", "structure": "...",
                "examples": [{"de": "...", "uz": "..."} ≥3], "common_mistakes": [{"wrong": "...", "right": "...", "why": "..."}],
                "check": ["<exercises ichidagi id>"] } ],
  "listening": {"title": "...", "lines": [{"speaker": "Anna", "de": "...", "uz": "..."}], "questions": ["<exercises ichidagi id>"]},
  "situation": {"title": "...", "context_uz": "...", "lines": [{"speaker": "...", "de": "...", "uz": "..."}], "task_uz": "..."},
  "exercises": [ <Exercise> 6–12 ta, kamida 3 xil type ],
  "final_test": [ <Exercise> 5–10 ta ]
}
```
`<Vocab>` (ID deterministik: `v-` + slug(otlar uchun "artikl so'z", boshqalar uchun so'z): kichik harf, bo'shliq → `-`, tinish belgilari tashlanadi, umlaut/ß saqlanadi. Masalan `der Morgen` → `v-der-morgen`, `Guten Tag` → `v-guten-tag`. Otda `de` artiklsiz, `plural` majburiy (`"die Kinder"` yoki `"-"`). Fe'lda `forms` majburiy: `partizip2`, `perfekt_aux` (haben|sein), ixtiyoriy `praesens_3sg`, `praeteritum`. `topic` — yopiq `TOPICS` ro'yxatidan): `{"id": "v-hallo", "de": "Hallo", "uz": "Salom", "pos": "noun|verb|adjective|adverb|pronoun|preposition|conjunction|interjection|numeral|phrase|article|particle", "article": "der|die|das|null", "plural": "die Kinder|null", "forms": {"infinitive","praesens_3sg","partizip2","perfekt_aux","praeteritum"} | null, "example_de": "...", "example_uz": "...", "topic": "greetings"}`. Bir xil `id` boshqa darsda qayta ta'riflanmaydi — `review_vocabulary` ga yoziladi.

`<Exercise>`:
```json
{ "id": "a1-m01-l1-e01", "version": 1, "type": "multiple_choice", "skill": "vocabulary", "topic": "greetings", "grammar_topic": null,
  "difficulty": 1, "question": "o'zbekcha savol/ko'rsatma", "prompt_de": "nemischa matn yoki null",
  "options": ["..."], "pairs": null, "correct_answer": "...", "accepted_answers": [], "criteria": null,
  "hint": "...", "explanation": "nega to'g'ri — o'zbekcha", "error_type": "vocabulary", "points": 1, "audio_text": null }
```
`topic` — yopiq ro'yxat `TOPICS` (`content_schema.py`). `grammar_topic` — `GRAMMAR_IDS` dan; `skill=grammar` bo'lsa majburiy. Zaif mavzu va retry `grammar_topic` (bo'lmasa `topic`) bo'yicha hisoblanadi.
`skill` ∈ vocabulary, grammar, reading, listening, writing, speaking. `error_type` ∈ vocabulary, article, case, conjugation, word_order, spelling, plural, comprehension, preposition, tense, other.

| type | Ma'nosi | correct_answer | options/pairs |
|---|---|---|---|
| multiple_choice, situation_choice, next_line, reading, listen_choice, article, find_error | variant tanlash | variant matni (options ichida bo'lishi shart) | options ≥2 |
| fill_blank, conjugate, plural, translate_de_uz, translate_uz_de, dictation | yozib javob | string | `accepted_answers` — muqobil to'g'ri javoblar; `___` savoldagi bo'sh joy |
| match | juftlash | `{"de": "uz", ...}` | pairs: [["de","uz"],...] ≥3 |
| order_words | so'z tartibi | to'g'ri gap | options = aralash so'zlar; `accepted_answers` — boshqa to'g'ri tartiblar |
| short_text, speak | ochiq javob | null | `criteria`: {"min_words": n, "required_words": [...], "sample": "..."} |

`listen_choice`/`dictation` uchun `audio_text` majburiy (TTS o'qiydi). `find_error`: options — gapdagi so'zlar, correct_answer — xato so'z, explanation tuzatilgan shaklni beradi.
Baholash (`services/grading.py`):
- Javob shakli: variant turlari va yozma turlar — string; `order_words` — `list[str]` (tokenlar tartibi, server `" ".join` qiladi); `match` — `{de: uz}` dict, faqat barcha juftlar to'g'ri bo'lsa to'g'ri.
- Normalizatsiya: Unicode NFC, kichik harf, barcha tinish belgilarini olib tashlash, bo'shliqlarni yig'ish, o'zbekcha apostrof variantlari (U+02BB, U+2018, U+2019, backtick) → `'`. `correct_answer` yoki `accepted_answers` dan biriga teng bo'lsa — to'g'ri.
- Faqat registr yoki faqat `ae/oe/ue/ss` ↔ `ä/ö/ü/ß` farqi bo'lsa — to'g'ri + `warning` ("Katta-kichik harf / umlautga e'tibor bering: …"). Frontend yozma maydonlarda ä ö ü ß tugmalarini beradi.
- Ochiq turlar (`short_text`, `speak`): `criteria` — so'z soni ≥ min_words va `required_words` mavjudligi; natija `checks` ro'yxati. `speak` (o'z bahosi) imtihon foiziga kirmaydi.

Modul fayli (`module.json`): `{id, version, level, number, title, title_de, goals:[...], lessons:["a1-m01-l1",...], module_test:[<Exercise> 8–12, id `mtest-a1-m01-NN`], writing_task: {id: "w-a1-m01", title, task_uz, required_words, min_words, max_words, criteria:[...], sample_answer}}` — writing_task majburiy.
Dars: lug'at 8–15, mashqlar 6–12 (≥3 xil tur), yakuniy test 5–10, `listening` majburiy.
Grammatika (`content/grammar/g-sein.json`): `{id, version, level, order, title, prerequisites:[ids], next:[ids], rule, when, structure, examples:[≥3], common_mistakes:[≥1], exercises:[<Exercise> ≥3]}`.
Placement/exams (`content/placement.json` id `placement`; `content/exams/mid-a1.json`, `exam-a1.json`, `mid-a2.json`, `exam-a2.json`): `{id, kind: placement|midterm|level_exam, level, title, pass_percent, sections:[{skill, title, exercises:[<Exercise>]}]}`.
O'qish (`content/reading/<id>.json`): `{id, version, level, title, title_uz, body, glossary:{"so'z": "tarjima"}, questions:[<Exercise> id `<id>-qN`]}`.

Grammatika mavzulari ID ro'yxati (qat'iy, `backend/scripts/validate_content.py: GRAMMAR_IDS`): g-alphabet, g-pronouns, g-sein-haben, g-praesens, g-verb-position, g-questions, g-articles, g-plural, g-possessive, g-negation, g-akkusativ, g-dativ, g-pronoun-cases, g-modal-verbs, g-separable-verbs, g-imperative, g-time-prepositions, g-place-prepositions, g-perfekt, g-perfekt-aux, g-praeteritum, g-comparison, g-subordinate, g-reflexive, g-future, g-polite-requests, g-adjectives.
Andoza dars: [content/a1/m01/l1.json](content/a1/m01/l1.json). Tekshirish: `python backend/scripts/validate_content.py` (0 error bo'lishi shart).

Kontent sifati qoidalari: nemischa — standart imlo, tabiiy A1/A2 jumlalar; o'zbekcha — lotin, `o'` `g'` uchun ASCII apostrof. Tijoriy darsliklardan ko'chirmaslik. Har mashqda `explanation` majburiy. Bir nechta to'g'ri javob bo'lishi mumkin bo'lsa — `accepted_answers`.

## 6. API (prefiks `/api`, JSON, xato: `{"detail": "o'zbekcha xabar"}`)
Auth kerak bo'lgan hammasi — cookie `dm_session`. 401 kirilmagan, 404, 409 email band, 422 validatsiya, 429 rate limit, 503 AI sozlanmagan. Foydalanuvchi faqat o'z ma'lumotini ko'radi (barcha so'rovlar `user_id = current_user.id` bilan).

| Metod va yo'l | So'rov | Javob |
|---|---|---|
| GET /health | – | `{status, db}` |
| POST /auth/register | `{email, password(≥8), display_name}` | 201 `UserOut{id,email,display_name,is_demo}` + cookie |
| POST /auth/login | `{email, password}` | `UserOut` + cookie |
| POST /auth/logout | – | 204, cookie o'chadi |
| GET /auth/me | – | `UserOut` |
| DELETE /users/me | `{password}` | 204 — barcha ma'lumot o'chiriladi |
| GET /settings, PUT /settings | `Settings{current_level,start_module,daily_minutes,goal,weekly_goal_days,reminders_enabled,new_per_day,onboarding_done}` | `Settings` |
| GET /curriculum | – | `{levels:[{code,title,modules:[{id,number,title,title_de,goals,percent,lessons:[{id,order,title,status,best_score}]}]}]}` |
| GET /lessons/{id} | – | dars (§5), barcha mashqlar `ExerciseOut` ko'rinishida + `progress`; birinchi ochilishda `lesson_progress.status='started'` |
| POST /exercises/{id}/check | `{answer}` | `{exercise_id, correct, correct_answer, explanation, hint, error_type, warning, points, retry_exercise: ExerciseOut or null}` — faqat owner_kind ∈ lesson, grammar, reading (final/module_test/exam/placement → 409 "Bu savol test ichida tekshiriladi"); `context` serverda aniqlanadi; urinish saqlanadi |
| GET /practice?mode=mistakes,topic,skill&topic=&skill=&limit=10 | – | `{exercises: ExerciseOut[]}` — xato qilingan (hali to'g'ri yechilmagan), mavzu yoki ko'nikma bo'yicha; faqat lesson/grammar/reading mashqlari, foydalanuvchi darajasigacha; `check` bilan tekshiriladi |
| GET /listening | – | `{items:[{lesson_id, lesson_title, level, title, lines, questions: ExerciseOut[]}]}` |
| POST /lessons/{id}/final | `{answers:{exercise_id: answer}}` | `{score,total,percent,passed(≥70%),results:[check javobi]}` → `lesson_progress`; o'tsa dars lug'ati `review_cards` ga qo'shiladi |
| GET /vocabulary?q=&topic=&level=&saved=&weak= | – | `{items:[VocabOut & {user:{saved,state,due_at,correct_count,wrong_count}|null}], topics:[...]}` |
| POST/DELETE /vocabulary/{id}/save | – | `VocabOut` |
| GET /review/queue?limit=20 | – | `{cards:[{card_id, vocab:VocabOut, direction:'de_uz'|'uz_de', state}], due_total, new_today_left}` |
| POST /review/{card_id}/answer | `{quality:0..5}` (UI: Yana=1, Qiyin=3, Yaxshi=4, Oson=5) | `ReviewCardOut` |
| GET /grammar, GET /grammar/{id} | – | mavzular (prerequisites/next), mavzu (mashqlar kalitsiz) |
| GET /placement, POST /placement/submit | `{answers}` | `{score_by_skill, percent, recommended_level, recommended_module}` |
| GET /exams, GET /exams/{id}, POST /exams/{id}/submit | `{answers}` | `{score,total,percent,passed,by_skill,results}` |
| GET /reading, GET /reading/{id} | – | matnlar (glossary bilan), savollar kalitsiz |
| GET /writing/tasks, POST /writing/submissions, GET /writing/submissions | `{task_id, text}` | `{id, task_id, text, word_count, checks:[{name, ok, message}], ai_feedback|null, created_at}` |
| POST /speaking/attempts | `{exercise_id?, target_text, recognized_text?, self_rating?}` | `{id, similarity, diff:[{word, ok}]}` |
| GET /progress/dashboard | – | `{level, course_percent, lessons_completed, lessons_total, today_lesson:{id,title}|null, due_reviews, next_recommendation:{kind,id,title,reason}, recent_results:[{kind,title,percent,created_at}]≤5, skills:{vocabulary,grammar,reading,listening,writing,speaking: 0..100|null}, streak, weekly_activity:[{day,exercises,correct}]×7, words_learned, weak_topics:[{topic,accuracy,attempts}], weekly_goal:{target_days,done_days}}` |
| GET /progress/stats | – | ko'nikma va mavzu bo'yicha batafsil |
| GET /ai/status, POST /ai/tutor | `{message, session_id?}` | `{configured, provider}` / `{session_id, reply}` yoki 503 |

`ExerciseOut` (kalitsiz): `{id, version, type, skill, topic, grammar_topic, difficulty, question, prompt_de, options, left, right, hint, audio_text, criteria:{min_words, required_words} or null, points}` — `correct_answer`, `accepted_answers`, `explanation`, `criteria.sample`, `pairs` hech qachon yuborilmaydi; `match` uchun `left`/`right` alohida aralashtiriladi, `order_words` tokenlari aralashtiriladi.
SM-2 holatlari: `new` → `learning` (interval < 7) → `review` (7–20) → `mastered` (interval ≥ 21 kun). quality < 3 → repetitions=0, interval=1, lapses+1.
Xavfsizlik: uvicorn `--proxy-headers --forwarded-allow-ips='*'` (nginx ortida rate limit IP bo'yicha to'g'ri ishlashi uchun); faqat `application/json` qabul qilinadi; AI: foydalanuvchiga kuniga `AI_DAILY_LIMIT` (standart 30) xabar.
Maxfiylik: ovoz yozuvi serverga yuborilmaydi; lekin brauzerning SpeechRecognition'i (Chrome) ovozni Google serveriga yuborishi mumkin — UI buni gapirish sahifasida aytadi.

Hisoblash qoidalari: ko'nikma foizi = shu ko'nikmadagi so'nggi 50 urinish to'g'riligi (urinish < 5 bo'lsa null). Zaif mavzu = to'g'rilik < 60% va urinish ≥ 4. So'z "o'rganilgan" = `review_cards.state in ('review','mastered')`. Kurs foizi = completed darslar / jami darslar. Streak = `daily_activity` dagi ketma-ket kunlar (bugun yoki kechadan boshlab).
Moslashuv: `check` noto'g'ri bo'lsa, xuddi shu `topic` dagi boshqa (hali to'g'ri yechilmagan) mashq ID'si `retry_exercise_id` sifatida qaytadi. Tavsiya: zaif mavzu bo'lsa — o'sha mavzuli grammatika/dars; aks holda due review > 0 bo'lsa takrorlash; aks holda keyingi tugallanmagan dars.

## 7. Frontend sahifalari
`/login`, `/register`, `/onboarding` (sozlamalar → diagnostika → tavsiya), `/` Dashboard, `/path` O'quv yo'li, `/lessons/:id` (bo'limlar: maqsad → tushuntirish → lug'at → grammatika → tinglash → mashqlar → real vaziyat → yakuniy test → xatolar tahlili), `/vocabulary`, `/review`, `/grammar`, `/grammar/:id`, `/listening`, `/speaking`, `/writing`, `/reading`, `/reading/:id`, `/tests`, `/tests/:id`, `/stats`, `/settings` (hisobni o'chirish shu yerda), `/tutor`.
Mobil: pastki tab-bar (Bosh, Yo'l, Takrorlash, Lug'at, Ko'proq), desktop: chap sidebar. Har sahifada loading/empty/error holatlari.

## 8. Bosqichlar va holat
Holat jadvali yangilanib boriladi: [.make-feature/deutsch-mastery/00-index.md](.make-feature/deutsch-mastery/00-index.md).
| Bosqich | Mazmun |
|---|---|
| 1 | Tahlil, shu reja |
| 2 | Backend infra + auth + Alembic, frontend skeleti, Docker |
| 3 | 24 modul / 72 dars kontenti, seed, dars sahifasi, mashqlar |
| 4 | SRS, progress, dashboard, statistika |
| 5 | O'qish, tinglash, yozish, gapirish |
| 6 | AI tutor (provider interfeysi, fallback) |
| 7 | pytest, vitest, Playwright e2e, mobil tekshiruv |
| 8 | README, cheklovlar, yakuniy hisobot |
