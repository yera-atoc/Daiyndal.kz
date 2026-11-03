// «Оқушыларды енгізу»: топтар тізімінен нені құру керегін есептеу (таза функциялар, клиент пен сервер).

export type ImpLesson = { days: number[]; start: string; end: string; subject: string; teacherId: string }
export type ImpStudent = { name: string; parentName: string; parentPhone: string; note: string }
export type ImpGroup = { key: string; name: string; grade: number | null; teacherId: string; lessons: ImpLesson[]; students: ImpStudent[] }

export type PlannedClass = { teacherId: string; name: string; subject: string; days: number[]; students: string[] }
export type PlannedSlot = { teacherId: string; day: number; start: string; end: string; title: string }

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export const cleanName = (s: string) => s.replace(/\s+/g, ' ').trim()

/** Қазақстан нөмірі → 77XXXXXXXXX (бос болса — бос) */
export function normPhone(raw: string): string {
  let d = (raw ?? '').replace(/\D/g, '')
  if (!d) return ''
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1)
  if (d.length === 10) d = '7' + d
  return d
}

export function phoneOk(raw: string) {
  const d = normPhone(raw)
  return d === '' || (d.length === 11 && d.startsWith('7'))
}

/** «тек математика» сияқты ескерту: оқушы тек сол пәнге барады */
export function onlySubject(note: string): string | null {
  const m = /тек\s+([^\s,.;]+)/i.exec(note ?? '')
  return m ? m[1].toLowerCase() : null
}

/** «+ ағылшын» сияқты ескерту: оқушы қосымша сол пәнге де барады (топта мұндай белгі болса — ол пәнге тек белгілілер) */
export function plusSubjects(note: string): string[] {
  return Array.from((note ?? '').matchAll(/\+\s*([^\s,.;+]+)/g)).map((m) => m[1].toLowerCase())
}

const subjMatch = (subject: string, word: string) => subject.toLowerCase().startsWith(word.slice(0, 4))

/** Енгізбес бұрын тексеру: қателер тізімі (бос болса — дайын) */
export function validateGroup(g: ImpGroup): string[] {
  const errs: string[] = []
  if (!cleanName(g.name)) errs.push('Топ атауы жоқ')
  if (!g.teacherId && g.lessons.some((l) => !l.teacherId)) errs.push('Мұғалім таңдалмаған')
  const names = g.students.map((s) => cleanName(s.name)).filter(Boolean)
  if (!names.length) errs.push('Оқушы жоқ')
  const unsure = names.filter((n) => n.includes('?'))
  if (unsure.length) errs.push(`Тексерілмеген аттар (?): ${unsure.length}`)
  const dup = names.filter((n, i) => names.indexOf(n) !== i)
  if (dup.length) errs.push(`Қайталанған аттар: ${Array.from(new Set(dup)).join(', ')}`)
  const badPhones = g.students.filter((s) => !phoneOk(s.parentPhone)).length
  if (badPhones) errs.push(`Қате нөмір: ${badPhones}`)
  for (const l of g.lessons) {
    if (!l.days.length) errs.push(`«${l.subject || 'сабақ'}»: күні таңдалмаған`)
    if ((l.start || l.end) && (!TIME_RE.test(l.start) || !TIME_RE.test(l.end) || l.end <= l.start)) errs.push(`«${l.subject || 'сабақ'}»: уақыты қате`)
  }
  return errs
}

/** Сабақ журналының топтары (мұғалім + пән бойынша) және кесте жолдары */
export function planGroup(g: ImpGroup): { classes: PlannedClass[]; slots: PlannedSlot[] } {
  const lessons = g.lessons.map((l) => ({ ...l, teacherId: l.teacherId || g.teacherId, subject: cleanName(l.subject) }))
  const subjects = Array.from(new Set(lessons.map((l) => `${l.teacherId}|${l.subject}`)))
  const single = subjects.length === 1
  const classes: PlannedClass[] = subjects.map((key) => {
    const [teacherId, subject] = key.split('|')
    const ls = lessons.filter((l) => l.teacherId === teacherId && l.subject === subject)
    const plusOnly = g.students.some((s) => plusSubjects(s.note).some((w) => subjMatch(subject, w)))
    const students = g.students
      .filter((s) => cleanName(s.name))
      .filter((s) => {
        const only = onlySubject(s.note)
        if (only && !subjMatch(subject, only)) return false
        if (plusOnly) return plusSubjects(s.note).some((w) => subjMatch(subject, w))
        return true
      })
      .map((s) => cleanName(s.name))
    return {
      teacherId,
      subject,
      name: single || !subject ? cleanName(g.name) : `${cleanName(g.name)} · ${subject}`,
      days: Array.from(new Set(ls.flatMap((l) => l.days))).sort(),
      students,
    }
  })
  const slots: PlannedSlot[] = lessons
    .filter((l) => TIME_RE.test(l.start) && TIME_RE.test(l.end))
    .flatMap((l) => l.days.map((day) => ({ teacherId: l.teacherId, day, start: l.start, end: l.end, title: l.subject ? `${cleanName(g.name)} · ${l.subject}` : cleanName(g.name) })))
  return { classes, slots }
}

/** Мұғалімді аты бойынша табу (журналдағы «Жолтай ағай» → «Жолтай …») */
export function guessTeacher(hint: string, teachers: { id: string; name: string }[]) {
  const h = hint.trim().toLowerCase()
  if (!h) return ''
  return teachers.find((t) => t.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(h) || h.startsWith(w)))?.id ?? ''
}
