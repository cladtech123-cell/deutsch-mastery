# Indeks — a2-lesen

- **Maqsad:** nemis tili A2 o'qish platformasi, Duolingo-o'xshash ilovalardan faqat zarur funksiyalar.
- **Rejim:** quick. Sabab: yangi, lekin bitta kontur (statik veb-ilova), to'liq qaytariladigan, pul/huquq/maxfiy ma'lumot yo'q.
- **Chegaralar:** 2 delegatsiya, 1 tuzatish, ~10 daqiqa. Sarflangan: 1 delegatsiya (qabul), 1 tuzatish partiyasi.
- **Hujjatlar:** [so'rov](01-request.md) · [yechim (C*, D*, reja)](02-solution.md) · [qabul](03-verification.md)
- **Qabul qilingan:** D1 (statik HTML + localStorage), D2 (umumiy DICT + qamrov testi).
- **Ochiq savollar:** yo'q.
- **Ishga tushirish:** `python -m http.server 8731` (yoki `.claude/launch.json` → `lesebuch`), so'ng http://localhost:8731. Test: `node test.js`.
- **Bosqich:** qabul qilindi. C1–C5, C7–C9 tasdiqlandi, C6 (ovoz) tekshirilmagan.
- **Qoldiq:** TTS ovozini haqiqiy qurilmada tinglash; iOS'da sinash; matnlar sonini oshirish (yangi matn = `TEXTS` ga obyekt + `DICT` yozuvlari; test yetishmayotgan so'zlarni ko'rsatadi).
