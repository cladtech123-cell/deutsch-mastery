# Qabul — status: accepted (C6 ochiq), v2. Kirish: [02-solution.md](02-solution.md)

## Ishga tushirish
- Ilova: `index.html` + `logic.js` + `texts.js` bitta papkada. Lokal server: `python -m http.server 8731` → http://localhost:8731 (`.claude/launch.json`, nom `lesebuch`).
- Test: `node test.js` → `OK: 6 matn, 263 so'z`.
- Baseline: `node test.js` kod yozilishidan oldin → `Cannot find module './logic.js'` (yiqildi).

## Muallif dalillari (orkestrator, Browser pane, localhost:8731)
| C | Harakat | Natija |
|---|---|---|
| C1 | Kutubxona skrinshoti (desktop, dark + light) | 6 ta sariq kitobcha, Nr. 1–6 |
| C2 | "Brot" bosildi | sheet: "non (das Brot)"; noma'lum so'z → "Bu so'z lug'atda yo'q." + Google Translate havolasi, "+ Lug'atga" yashirin |
| C3 | "+ Lug'atga qo'shish" (Brot, Kaffee) | tugma → "✓ Lug'atda · olib tashlash", so'z sariq fon, tab "Lug'atim (2)" |
| C4 | Takrorlash: Brot xato, keyin 2× to'g'ri | "Qoldi: 2" → xato so'z navbat oxiriga; yakunda box 1, due 2026-10-21 |
| C5 | Javoblar 1 to'g'ri/1 xato/1 to'g'ri | "2/3 to'g'ri · +10 XP", xato variant qizil, to'g'risi yashil |
| C6 | Tinglash tugmasi bor (`speechSynthesis` mavjud) | Ovoz sifati brauzerda tinglanmagan — **tekshirilmagan** |
| C7 | Test + takrorlashdan keyin | streak 1, 14/20 XP, maqsad chizig'i to'lgan |
| C8 | Sahifani qayta yuklash | streak 1, 14 XP, "2/3 to'g'ri" belgisi, saqlangan so'zlar joyida |
| C9 | 375×812 mobil (tuzatishdan keyin) | `innerWidth 375`, `scrollWidth 375`, body 16px. Birinchi tekshiruv noto'g'ri edi: viewport meta yo'q, innerWidth 980 bo'lgan (qabul agenti topdi) |

## Tuzatishlar (1 ta tuzatish limiti ichida, bitta partiya)
1. `<meta charset="utf-8">` yo'q edi → windows-1252 sifatida dekodlanib, `texts.js` da SyntaxError chiqdi. Qo'shildi.
2. `.btn { display:inline-flex }` `hidden` ni bekor qilardi → `[hidden]{display:none!important}`; `openWord` ga `#sgt.hidden` qatori qo'shildi.

## Mustaqil qabul (general-purpose agent aa6683c2a113b5894, faqat o'qish)
`node test.js` → OK. C1–C5, C7, C8 tasdiqlandi; C6 tekshirilmagan (ovoz tinglanmagan); C9 **yiqildi** (viewport meta yo'q).
Nemischa matnlar va 19 ta savol to'g'ri deb topildi; ~120 ta DICT yozuvi ko'rib chiqildi.

## Qabuldan keyingi tuzatish partiyasi (1/1)
| Nuqson | Tuzatish | Qayta tekshiruv |
|---|---|---|
| Viewport meta yo'q (High) | `<meta name="viewport" ...>` | 375px: innerWidth 375, skrinshot o'qiladi |
| Regex lookbehind iOS < 16.4 da skriptni o'ldiradi | `match(/[^.!?“]+[.!?“]*\s*/g)` | 4 ta gap to'g'ri ajratildi |
| Bir xil testni qayta yechib XP yig'ish | faqat oldingi eng yaxshi natijadan oshgan qism uchun XP | 2/3 → 3/3: +5 XP |
| `cancel()` dan keyin "To'xtatish" yozuvi qotadi | `onerror` ham yozuvni tiklaydi | kod; ovozsiz sinalmagan |
| Noto'g'ri tuzilgan JSON (`{"cards":null}`) ilovani yiqitadi | `load()` shaklni tekshiradi → `blank()` | `load().cards` → `{}` |
| Kontent: zu, meinen, dran, Bad, "das Essen" | tarjimalar tuzatildi, "Abendessen" | `node test.js` → OK, 264 so'z |

## Qoldiq
- C6: TTS ovozi haqiqiy qurilmada tinglanmagan; nemis ovozi bo'lmasa brauzer standart ovozdan foydalanadi.
- Haqiqiy iOS qurilmada sinalmagan.
- Progress faqat shu brauzerda saqlanadi (localStorage), qurilmalar o'rtasida sinxronlanmaydi.

## Saboq
Xato: mobil tekshiruv viewport meta bo'lmasa ham o'tdi → sabab: `scrollWidth<=innerWidth` 980px virtual kenglikda ham to'g'ri → qoida: mobil tekshiruvda avval `innerWidth === 375` ni tasdiqlash.

## Sarf
Delegatsiyalar 1/2, tuzatishlar 1/1. Tokenlar: qabul agenti 112 748 (harness), orkestrator — unknown.
