# Yechim — status: accepted, v1, muallif: orkestrator. Kirish: [01-request.md](01-request.md)

## Talablar (C*)
- **C1** Kutubxona: A2 darajadagi 6 ta qisqa nemischa matn (kundalik mavzular, Präsens + Perfekt).
- **C2** So'zni bosish → o'zbekcha tarjima chiqadi (LingQ/Readlang). Lug'atda yo'q so'z → Google Translate havolasi.
- **C3** So'zni shaxsiy lug'atga saqlash.
- **C4** Saqlangan so'zlarni intervalli takrorlash (Leitner, Duolingo/Anki): bildim → keyinroq, bilmadim → bugun yana.
- **C5** Matndan keyin tushunish testi (3–4 savol), darhol to'g'ri/xato ko'rsatiladi.
- **C6** Matnni / so'zni ovozli tinglash (TTS, de-DE) (Beelinguapp).
- **C7** Motivatsiya: XP, kunlik maqsad (20 XP), streak (Duolingo).
- **C8** Progress qurilmada saqlanadi (sahifa qayta ochilganda yo'qolmaydi).
- **C9** Interfeys o'zbek tilida, telefonda ishlaydi.

Baseline: papka bo'sh, hech narsa yo'q.

## Asoslar va tanlov
- **D1** Statik `index.html` + `logic.js` (sof funksiyalar) + `texts.js` (kontent). Build, server, akkaunt yo'q — `index.html` ni ochish kifoya. Saqlash: `localStorage`.
  Sabab: bitta foydalanuvchi, maxfiy ma'lumot yo'q; server/akkaunt hech bir C* uchun shart emas.
- **D2** Barcha matnlar uchun umumiy `DICT` (kichik harfli so'z shakli → tarjima). Test har bir matndagi har bir so'z `DICT` da borligini tekshiradi.

Olinmadi (ataylab): akkaunt/login, reyting jadvali, "yuraklar", nutqni tanish, AI, to'lov, to'liq parallel tarjima, matn qo'shish muharriri.

## Shartnoma (ma'lumot)
`localStorage['a2lesen']` = `{xp, xpDay, xpToday, streak, last, done:{id:ball}, cards:{so'z:{w,tr,box,due}}}`. O'qish/yozish try/catch ichida; buzilgan JSON → yangi holat.
Leitner oraliqlari (kun): box 0..5 → `[0,1,3,7,14,30]`. Xato → box 0, due = bugun.
Streak: oxirgi faol kun kecha bo'lsa +1, bugun bo'lsa o'zgarmaydi, aks holda 1.

## Reja (T*)
- T1 `logic.js` + `test.js` (node) — SRS, streak, tokenize, lug'at qamrovi. → C2, C4, C7
- T2 `texts.js` — 6 matn, savollar, DICT. → C1, C5
- T3 `index.html` — UI. → C2–C9
- T4 Brauzerda tekshirish (desktop + mobil).

## Asosiy xavf
Lug'atda tarjima xato yoki yetishmasligi → test qamrovni tekshiradi, tarjima sifatini qabul agenti tanlab ko'radi.
