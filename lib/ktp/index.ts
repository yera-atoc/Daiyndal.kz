// КТП үлгілерін топқа бейімдеу: аптасына неше сабақ, айлық Білім тексеру апталары, қысқы қайталау.
import { TEMPLATES, type KtpTemplate } from './templates'

export { TEMPLATES }
export type { KtpTemplate }

export type KtpWeek = { a: string; b: string; hw: string | null }
export type KtpItem = { topic: string; homework: string | null; week: number; kind: 'lesson' | 'test' | 'review' }

const MONTH_GEN = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']
const MONTH = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан']

export function parseWeeks(t: KtpTemplate): KtpWeek[] {
  return t.weeks
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [lessons, hw] = l.split('::').map((x) => x.trim())
      const [a, b] = lessons.split(';').map((x) => x.trim())
      return { a, b: b || a, hw: hw && hw !== '—' ? hw : null }
    })
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const mondayOf = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return addDays(iso, -((d + 6) % 7))
}

export type CalWeek = { start: string; kind: 'lesson' | 'test' | 'review'; month?: number }

/**
 * Оқу күнтізбесі (Мамырдың соңына дейін): әр айдың соңғы толық аптасы — Білім тексеру,
 * 28 желтоқсан аптасы — жыл қорытындысы. Наурыз мерекесіне түссе, сынақ бір апта бұрын.
 */
export function calendar(from: string, until = '2027-05-28'): CalWeek[] {
  const out: CalWeek[] = []
  for (let m = mondayOf(from); m <= until; m = addDays(m, 7)) out.push({ start: m, kind: 'lesson' })
  const months = Array.from(new Set(out.map((w) => w.start.slice(0, 7))))
  for (const ym of months) {
    // айдың соңғы аптасы: дүйсенбісі де, жұмасы да сол айда
    let idx = -1
    out.forEach((w, i) => {
      if (w.start.slice(0, 7) === ym && addDays(w.start, 4).slice(0, 7) === ym) idx = i
    })
    if (idx < 0) continue
    const s = out[idx].start
    if (s.slice(5, 7) === '03' && s.slice(8) >= '16' && s.slice(8) <= '25' && idx > 0) idx -= 1 // Наурыз
    if (out[idx].kind === 'lesson') out[idx] = { ...out[idx], kind: 'test', month: Number(ym.slice(5, 7)) }
  }
  for (const w of out) if (w.kind === 'lesson' && w.start.slice(5) >= '12-26' && w.start.slice(5) <= '12-31') w.kind = 'review'
  return out
}

/** Үлгіні топқа бейімдеп, сабақтар тізімін жасау. perWeek — аптасына сабақ саны (топ күндерінен) */
export function buildPlan(t: KtpTemplate, perWeek: number, from: string): KtpItem[] {
  const n = Math.min(6, Math.max(1, perWeek || 2))
  const weeks = parseWeeks(t)
  const cal = calendar(from)
  const out: KtpItem[] = []
  let k = 0
  cal.forEach((w, wi) => {
    if (w.kind === 'test') {
      const mon = MONTH_GEN[(w.month ?? 1) - 1]
      const items = [
        { topic: `Қайталау: ${mon} айының тақырыптары`, homework: 'Айдың қателерімен жұмыс, тест 20 сұрақ' },
        { topic: `Білім тексеру — ${MONTH[(w.month ?? 1) - 1]} сынағы`, homework: null },
        { topic: 'Қатемен жұмыс: сынақ талдауы', homework: 'Кабинеттегі «Қатемен жұмыс» бөлімі' },
      ]
      const take = n === 1 ? [items[1]] : n === 2 ? items.slice(0, 2) : [...items, ...Array.from({ length: n - 3 }, () => ({ topic: 'Жеке консультация: әлсіз тақырыптар', homework: null }))]
      take.forEach((x) => out.push({ ...x, week: wi, kind: 'test' }))
      return
    }
    if (w.kind === 'review') {
      const items = [
        { topic: 'Жыл қорытындысы: өткен тақырыптарды қайталау', homework: 'Қайталау тесті (кабинетте)' },
        { topic: 'Олимпиадалық / шығармашылық тапсырмалар', homework: null },
      ]
      Array.from({ length: n }, (_, i) => items[Math.min(i, 1)]).forEach((x) => out.push({ ...x, week: wi, kind: 'review' }))
      return
    }
    const wk = weeks[k++]
    if (!wk) return
    const lessons =
      n === 1
        ? [{ topic: wk.a === wk.b ? wk.a : `${wk.a}. ${wk.b}`, homework: wk.hw }]
        : [
            { topic: wk.a, homework: wk.hw },
            { topic: wk.b, homework: wk.hw },
            ...Array.from({ length: n - 2 }, (_, i) => ({ topic: `Практикум: ${i % 2 ? wk.b : wk.a}`, homework: 'Қосымша есептер / тест (кабинетте)' })),
          ]
    lessons.forEach((x) => out.push({ ...x, week: wi, kind: 'lesson' }))
  })
  return out
}

const gradeOf = (name: string) => {
  const m = name.match(/(\d{1,2})\s*[- ]?\s*(сынып|класс|class|кл|grade)/i) ?? name.match(/(?:^|\D)(\d{1,2})(?:\D|$)/)
  const g = m ? Number(m[1]) : NaN
  return g >= 1 && g <= 11 ? g : null
}

/** Топқа ең лайық үлгі (пән + атаудағы сынып пен НЗМ/БИЛ/ҰБТ/IELTS белгілері) */
export function pickTemplate(subject: string | null | undefined, name: string): KtpTemplate | null {
  const text = `${subject ?? ''} ${name}`.toLowerCase()
  const g = gradeOf(name)
  let best: { t: KtpTemplate; s: number } | null = null
  for (const t of TEMPLATES) {
    const subj = t.subject.toLowerCase()
    let s = 0
    // пәні сәйкес пе
    const subjHit = text.includes(subj.slice(0, 5)) || t.keys.some((k) => text.includes(k))
    if (!subjHit) continue
    s += 2
    for (const k of t.keys) if (text.includes(k)) s += k.length > 3 ? 2 : 1
    if (t.grades && g) s += g >= t.grades[0] && g <= t.grades[1] ? 4 : -3
    // ерекше бағыттар
    if (/нзм|ниш|бил/.test(text) && /^nzm|kazakh|russian/.test(t.id)) s += 3
    if (/ұбт|ubt|ент/.test(text) && t.id.startsWith('ubt')) s += 3
    if (/ielts/.test(text) && t.id.includes('ielts')) s += 4
    if (/физика/.test(text) && t.id.includes('phys')) s += 3
    if (!best || s > best.s) best = { t, s }
  }
  return best?.t ?? null
}

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id) ?? null
