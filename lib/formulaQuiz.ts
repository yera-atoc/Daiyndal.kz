// Формулалардан күнделікті сұрақтар: «Мына ереженің формуласы қайсы?» және «Бұл қай формула?» кезектесіп.
// Бір күні бүкіл топқа бірдей (рейтинг әділ болу үшін), күн сайын жаңа — 67 формула ~14 күнде түгел өтеді.
import { FORMULAS, type Formula } from './formulas'
import { DAILY_COUNT, dayIndex, pickIndices } from './daily'
import { LETTERS } from './bilimTest'

export type QuizQuestion = { id: number; text: string; options: string[]; answer: string; topic: string; explain: string }

function rng(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], r: () => number) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Шатастыратын 3 нұсқа: алдымен сол бөлімнен, жетпесе — басқа бөлімдерден */
function distractors(f: Formula, r: () => number): Formula[] {
  const same = shuffle(FORMULAS.filter((x) => x.n !== f.n && x.section === f.section), r)
  const other = shuffle(FORMULAS.filter((x) => x.section !== f.section), r)
  return [...same, ...other].slice(0, 3)
}

export function formulaQuestion(f: Formula, kind: 'formula' | 'name', seed: number): QuizQuestion {
  const r = rng(seed)
  const pool = shuffle([f, ...distractors(f, r)], r)
  const pick = (x: Formula) => (kind === 'formula' ? x.formula : x.name)
  const text = kind === 'formula' ? `«${f.name}» — формуласы қайсы?` : `Бұл қай ереже (формула)?\n${f.formula}`
  return {
    id: f.n,
    text,
    options: pool.map(pick),
    answer: LETTERS[pool.indexOf(f)],
    topic: `${f.n}-формула · ${f.section}`,
    explain: `${f.n}. ${f.name}: ${f.formula}${f.example ? `\nМысалы: ${f.example}` : ''}`,
  }
}

/** Бүгінгі 5 сұрақ (күн бойынша тұрақты) */
export function formulaQuiz(day: string, count = DAILY_COUNT): QuizQuestion[] {
  const d = Math.max(0, dayIndex(day))
  return pickIndices(day, FORMULAS.length, count).map((i, k) => formulaQuestion(FORMULAS[i], (d + k) % 2 === 0 ? 'formula' : 'name', d * 101 + i))
}
