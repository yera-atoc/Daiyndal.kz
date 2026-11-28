import type { Exam } from './bilimTest'
import { VOCAB_BANK } from './vocabBank'
import { VOCAB_BANK_KIDS } from './vocabBankKids'
import { VOCAB_BANK_PIC } from './vocabBankPic'

// Күнделікті сөздік тест: әр күні сөз қорынан жаңа 100 сөз (A1–A2).
// Сұрақ: ағылшын сөзі → дұрыс аударма (қазақша — орысша), 4 нұсқа.
// Бір күннің тесті барлық оқушыға бірдей (күн бойынша детерминистік), сөз қоры
// таусылғанда жаңа ретпен қайта айналады.

export const DAILY_VOCAB_SIZE = 100
const START = Date.UTC(2026, 10, 27) // 2026-11-27 — 1-күн

// Күнделікті тест қосылатын топтар (атауы бойынша)
// 'std' — A1–A2 сөздер (ересектер, Pre-IELTS); 'kids' — A0–A1 сөздер (кіші сыныптар, «A1-3»)
// 'pic' — A0: суретке қарап ағылшын сөзін таңдау (күніне 30)
export type DailyVocabKind = 'std' | 'kids' | 'pic'
export function dailyVocabKind(groupName: string | undefined | null): DailyVocabKind | null {
  const n = groupName ?? ''
  if (/^\s*[aа]0\s*(топ|тобы)?\s*$/i.test(n)) return 'pic'
  if (/^\s*[aа]1\s*[-–—]\s*3\s*(топ|тобы)?\s*$/i.test(n)) return 'kids' // А кирилше не латынша
  if (/english[\s-]*adults|pre[\s-]*ielts/i.test(n)) return 'std'
  return null
}
export const dailyVocabEnabled = (groupName: string | undefined | null) => dailyVocabKind(groupName) !== null

export const dailyVocabId = (groupId: string, day: string, kind: DailyVocabKind = 'std') =>
  `${groupId}_vocab-${kind === 'kids' ? 'dayk' : kind === 'pic' ? 'dayp' : 'day'}-${day}`
export const isDailyVocabId = (id: string) => /_vocab-day[kp]?-\d{4}-\d{2}-\d{2}$/.test(id)

// Алматы уақыты бойынша бүгінгі күн: YYYY-MM-DD
export function almatyDay(now = Date.now()): string {
  return new Date(now + 5 * 3600 * 1000).toISOString().slice(0, 10)
}

function rng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function shuffle<T>(a: T[], r: () => number): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

const words = (s: string) => s.toLowerCase().split(/[\s,;()/—-]+/).filter((w) => w.length > 2)
// Дистрактор дұрыс жауапқа ұқсас болмасын (ортақ сөз болса — алмаймыз)
type Word = (typeof VOCAB_BANK)[number]
const clash = (a: Word, b: Word) => {
  const x = new Set([...words(a[2]), ...words(a[3])])
  return [...words(b[2]), ...words(b[3])].some((w) => x.has(w))
}

const MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']
export const dayLabel = (day: string) => `${Number(day.slice(8, 10))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`

// A0: сурет (эмодзи) → ағылшын сөзі, 4 нұсқа. Дистракторлар — мүмкіндігінше сол топтан (жануар, тамақ…)
export const PIC_SIZE = 30
function dailyPic(day: string) {
  const B = VOCAB_BANK_PIC
  const n = Math.max(0, Math.round((Date.parse(day + 'T00:00:00Z') - START) / 86400000))
  const perCycle = Math.floor(B.length / PIC_SIZE)
  const order = shuffle(B, rng(`vocab-pic-cycle-${Math.floor(n / perCycle)}`))
  const today = order.slice((n % perCycle) * PIC_SIZE, (n % perCycle + 1) * PIC_SIZE)
  const r = rng(`vocab-pic-day-${day}`)
  const key = balancedKey(today.length, r)
  const questions = today.map((w, i) => {
    const same = shuffle(B.filter((x) => x[4] === w[4] && x[1] !== w[1]), r)
    const other = shuffle(B.filter((x) => x[4] !== w[4]), r)
    const opts = [...same, ...other].slice(0, 3).map((x) => x[1])
    opts.splice('ABCD'.indexOf(key[i]), 0, w[1])
    return { text: w[0], options: opts }
  })
  return { words: today.map((w) => w[1]), questions, key }
}

function balancedKey(len: number, r: () => number): string[] {
  const key: string[] = []
  const cnt: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
  for (let i = 0; i < len; i++) {
    const o = shuffle(['A', 'B', 'C', 'D'], r).sort((a, b) => cnt[a] - cnt[b])
    const pick = o.find((l) => !(key.length >= 2 && key[key.length - 1] === l && key[key.length - 2] === l)) ?? o[0]
    key.push(pick)
    cnt[pick]++
  }
  return key
}

export function dailyVocab(day: string, kind: DailyVocabKind = 'std'): { words: string[]; questions: { text: string; options: string[] }[]; key: string[] } {
  if (kind === 'pic') return dailyPic(day)
  const BANK: Word[] = kind === 'kids' ? VOCAB_BANK_KIDS : VOCAB_BANK
  const tag = kind === 'kids' ? 'kids-' : ''
  const n = Math.max(0, Math.round((Date.parse(day + 'T00:00:00Z') - START) / 86400000))
  const perCycle = Math.floor(BANK.length / DAILY_VOCAB_SIZE)
  const cycle = Math.floor(n / perCycle)
  const idx = n % perCycle
  const order = shuffle(BANK, rng(`vocab-${tag}cycle-${cycle}`))
  const today = order.slice(idx * DAILY_VOCAB_SIZE, (idx + 1) * DAILY_VOCAB_SIZE)
  const r = rng(`vocab-${tag}day-${day}`)
  // Кілт: әр әріп 25 реттен, бір әріп қатарынан үш рет келмейді
  const key: string[] = []
  const cnt: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
  for (let i = 0; i < today.length; i++) {
    const order4 = shuffle(['A', 'B', 'C', 'D'], r).sort((a, b) => cnt[a] - cnt[b])
    const pick = order4.find((l) => !(key.length >= 2 && key[key.length - 1] === l && key[key.length - 2] === l)) ?? order4[0]
    key.push(pick)
    cnt[pick]++
  }
  const questions = today.map((w, i) => {
    const pool = BANK.filter((x) => x[1] === w[1] && x[0] !== w[0] && !clash(w, x))
    const ds: Word[] = []
    for (const x of shuffle(pool, r)) {
      if (ds.length === 3) break
      if (!ds.some((d) => clash(d, x))) ds.push(x)
    }
    const opts = ds.map((d) => `${d[2]} — ${d[3]}`)
    opts.splice('ABCD'.indexOf(key[i]), 0, `${w[2]} — ${w[3]}`)
    return { text: w[0], options: opts }
  })
  return { words: today.map((w) => w[0]), questions, key }
}

export function dailyVocabExam(groupId: string, day: string, kind: DailyVocabKind = 'std'): Exam {
  const { questions, key } = dailyVocab(day, kind)
  const lvl = kind === 'kids' ? ' (A0–A1)' : kind === 'pic' ? ' (A0 · суретпен)' : ''
  return {
    id: dailyVocabId(groupId, day, kind),
    group_id: groupId,
    month: day.slice(0, 7),
    title: `Күнделікті сөздік${lvl} · ${dayLabel(day)}`,
    subjects: [{ id: 'english', name: `Күнделікті ${questions.length} сөз · ${dayLabel(day)}`, short: 'Vocabulary', max: 100, questions: questions.length, options: 4 }],
    open_subjects: ['english'],
    answer_key: { english: key },
    questions: { english: questions },
    published: false,
    practice: true,
  } as Exam
}
