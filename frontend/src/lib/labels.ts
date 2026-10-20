import type { Answer, CardState, DailyMinutes, ErrorType, ExamKind, Goal, Skill } from '../api/types'

export const SKILLS: Skill[] = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking']

export const skillLabel: Record<string, string> = {
  vocabulary: "Lug'at",
  grammar: 'Grammatika',
  reading: "O'qish",
  listening: 'Tinglash',
  writing: 'Yozish',
  speaking: 'Gapirish',
}

export const errorTypeLabel: Record<ErrorType, string> = {
  vocabulary: "Lug'at (so'z ma'nosi)",
  article: 'Artikl',
  case: 'Kelishik',
  conjugation: "Fe'l tuslanishi",
  word_order: "So'z tartibi",
  spelling: 'Imlo',
  plural: "Ko'plik shakli",
  comprehension: 'Tushunish',
  preposition: 'Predlog',
  tense: 'Zamon',
  other: 'Boshqa',
}

export const posLabel: Record<string, string> = {
  noun: 'ot',
  verb: "fe'l",
  adjective: 'sifat',
  adverb: 'ravish',
  pronoun: 'olmosh',
  preposition: 'predlog',
  conjunction: "bog'lovchi",
  interjection: 'undov',
  numeral: 'son',
  phrase: 'ibora',
  article: 'artikl',
  particle: 'yuklama',
}

export const formLabel: Record<string, string> = {
  praesens_3sg: 'Präsens (er/sie/es)',
  partizip2: 'Partizip II',
  perfekt_aux: 'Perfekt yordamchisi',
  praeteritum: 'Präteritum',
}

export const cardStateLabel: Record<CardState, string> = {
  new: 'yangi',
  learning: "o'rganilmoqda",
  review: 'takrorlanmoqda',
  mastered: "o'zlashtirilgan",
}

export const examKindLabel: Record<ExamKind, string> = {
  placement: 'Diagnostik test',
  module_test: 'Modul testlari',
  midterm: 'Oraliq testlar',
  level_exam: 'Sinov imtihonlari',
}

export function formatAnswer(a: Answer | null | undefined): string {
  if (a == null) return '—'
  if (typeof a === 'string') return a
  if (Array.isArray(a)) return a.join(' ')
  return Object.entries(a)
    .map(([k, v]) => `${k} — ${v}`)
    .join('; ')
}

// Uzbek names by hand: browsers often ship no uz-UZ locale data and silently fall back to English.
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const WEEKDAYS = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh']

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : `${d.getDate()}-${MONTHS[d.getMonth()]}, ${d.getFullYear()}`
}

export function weekdayShort(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : WEEKDAYS[d.getDay()]
}

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

export const GOALS: { value: Goal; label: string }[] = [
  { value: 'daily', label: 'Kundalik hayot' },
  { value: 'living', label: 'Germaniyada yashash' },
  { value: 'study', label: "O'qish (universitet)" },
  { value: 'ausbildung', label: 'Ausbildung' },
  { value: 'work', label: 'Ish' },
  { value: 'general', label: "Umumiy til o'rganish" },
]
export const MINUTES: DailyMinutes[] = [15, 30, 45, 60]
