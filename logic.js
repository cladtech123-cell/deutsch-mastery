// Pure functions shared by index.html and test.js (no DOM). Dates are local 'YYYY-MM-DD' strings.
const INTERVALS = [0, 1, 3, 7, 14, 30]; // days until next review, per Leitner box

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayISO(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function review(card, ok, day) {
  const box = ok ? Math.min(card.box + 1, INTERVALS.length - 1) : 0;
  return { ...card, box, due: addDays(day, INTERVALS[box]) };
}

function isDue(card, day) { return card.due <= day; }

function touchStreak(s, day) {
  if (s.last === day) return s;
  return { ...s, last: day, streak: s.last === addDays(day, -1) ? s.streak + 1 : 1 };
}

function currentStreak(s, day) {
  return s.last === day || s.last === addDays(day, -1) ? s.streak : 0;
}

// Odd indices are words, even indices are spaces/punctuation; join('') restores the text.
function tokenize(text) { return text.split(/([A-Za-zÄÖÜäöüß]+)/); }

if (typeof module !== 'undefined') module.exports = { INTERVALS, addDays, todayISO, review, isDue, touchStreak, currentStreak, tokenize };
