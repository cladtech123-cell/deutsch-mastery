// Run: node test.js
const assert = require('assert');
const L = require('./logic.js');
const { TEXTS, DICT } = require('./texts.js');

// Leitner SRS: right answer moves a box up, wrong answer drops to box 0 (due again today)
let c = { w: 'Brot', tr: 'non', box: 0, due: '2026-10-20' };
c = L.review(c, true, '2026-10-20'); assert.deepStrictEqual([c.box, c.due], [1, '2026-10-21']);
c = L.review(c, true, '2026-10-21'); assert.deepStrictEqual([c.box, c.due], [2, '2026-10-24']);
c = L.review(c, false, '2026-10-24'); assert.deepStrictEqual([c.box, c.due], [0, '2026-10-24']);
for (let i = 0; i < 10; i++) c = L.review(c, true, '2026-10-24');
assert.strictEqual(c.box, 5);
assert.ok(L.isDue({ due: '2026-10-20' }, '2026-10-20'));
assert.ok(!L.isDue({ due: '2026-10-21' }, '2026-10-20'));
assert.strictEqual(L.addDays('2026-12-31', 1), '2027-01-01');

// Streak: same day keeps, next day +1, gap resets; shown as 0 after a missed day
let s = { streak: 0, last: null };
s = L.touchStreak(s, '2026-10-20'); assert.strictEqual(s.streak, 1);
s = L.touchStreak(s, '2026-10-20'); assert.strictEqual(s.streak, 1);
s = L.touchStreak(s, '2026-10-21'); assert.strictEqual(s.streak, 2);
assert.strictEqual(L.currentStreak(s, '2026-10-22'), 2);
assert.strictEqual(L.currentStreak(s, '2026-10-23'), 0);
s = L.touchStreak(s, '2026-10-23'); assert.strictEqual(s.streak, 1);

// Tokenizer keeps umlauts/ß inside words and round-trips the text
const t = L.tokenize('Ich heiße Anna. Über „Käse“!');
assert.deepStrictEqual(t.filter((_, i) => i % 2), ['Ich', 'heiße', 'Anna', 'Über', 'Käse']);
assert.strictEqual(t.join(''), 'Ich heiße Anna. Über „Käse“!');

// Content: every word of every text has a translation, quiz answers point at a real option
const missing = new Set();
for (const tx of TEXTS) {
  L.tokenize(tx.body).forEach((w, i) => { if (i % 2 && !DICT[w.toLowerCase()]) missing.add(w.toLowerCase()); });
  for (const q of tx.quiz) assert.ok(q.a >= 0 && q.a < q.o.length, tx.id + ': ' + q.q);
}
assert.deepStrictEqual([...missing], [], "tarjimasi yo'q so'zlar");
assert.strictEqual(new Set(TEXTS.map(x => x.id)).size, TEXTS.length);

console.log('OK:', TEXTS.length, 'matn,', Object.keys(DICT).length, "so'z");
