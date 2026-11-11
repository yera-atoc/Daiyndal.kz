// Оқушыларды мұғалімдерге бөлу ережелері (таза функция — тесттелген).
// Әр CRM тобы → пәндері (Білім тексеру пәндерінен, атауынан, кестеден) → ереже бойынша мұғалім.

export type SubjKey = 'math' | 'english' | 'physics' | 'kazakh' | 'russian' | 'history' | 'science' | 'chemistry' | 'informatics' | 'biology'

export const SUBJECT_NAME: Record<SubjKey, string> = {
  math: 'Математика',
  english: 'Ағылшын тілі',
  physics: 'Физика',
  kazakh: 'Қазақ тілі',
  russian: 'Орыс тілі',
  history: 'Қазақстан тарихы',
  science: 'Жаратылыстану',
  chemistry: 'Химия',
  informatics: 'Информатика',
  biology: 'Биология',
}

export type AGroup = { id: string; name: string; bt_group_id?: string | null }
export type ABtGroup = { id: string; name: string; subjects: { id: string; name?: string }[] }
export type AStudent = { id: string; full_name: string; group_id: string | null; status?: string | null }
export type ATeacher = { id: string; name: string; subject: string | null }
export type ASlot = { teacher_id: string; group_id: string | null }

export type AssignRow = {
  groupId: string
  groupName: string
  students: number
  subject: SubjKey
  /** пән қайдан анықталды: bt — Білім тексеру, name — атауынан, slot — кестеден, guess — болжам */
  source: 'bt' | 'name' | 'slot' | 'guess'
  grade: number | null
  teacherId: string | null
  rule: string
}

const low = (s: string | null | undefined) => (s ?? '').toLowerCase()

/** Білім тексеру пәнінің кілті → пән */
export function btSubject(id: string): SubjKey | null {
  if (id === 'math' || id === 'quant') return 'math'
  if (id === 'english' || id === 'reading' || id === 'grammar' || id === 'listening' || id === 'writing') return 'english'
  if (['physics', 'kazakh', 'russian', 'history', 'science', 'chemistry', 'informatics', 'biology'].includes(id)) return id as SubjKey
  return null
}

/** Атаудан / мұғалім пәнінен пәндерді табу */
export function subjectsFromText(t: string): SubjKey[] {
  const s = low(t)
  const out = new Set<SubjKey>()
  if (/english|ағылшын|английск|ielts|toefl|\ba1\b|\ba2\b|\bb1\b|starter/.test(s)) out.add('english')
  if (/(?<![а-яәіңғүұқөһ])мат|математ|алгебр|геометр|math/.test(s)) out.add('math')
  if (/физик|physics/.test(s)) out.add('physics')
  if (/қазақ тіл|казахск|kazakh/.test(s)) out.add('kazakh')
  if (/орыс|русск|russian/.test(s)) out.add('russian')
  if (/тарих|истори|history/.test(s)) out.add('history')
  if (/химия|chemistry/.test(s)) out.add('chemistry')
  if (/информатик|informatics/.test(s)) out.add('informatics')
  if (/биолог|biology/.test(s)) out.add('biology')
  if (/жаратылыстан|science/.test(s)) out.add('science')
  return Array.from(out)
}

/** Топ атауынан сынып (НЗМ/БИЛ дайындық — 6, ҰБТ — 11, белгісіз — null) */
export function gradeOfGroup(name: string): number | null {
  const s = low(name)
  const m = s.match(/(?:^|\D)(\d{1,2})\s*[–-]\s*\d{1,2}\s*(?:сынып|класс)/) ?? s.match(/(\d{1,2})\s*[- ]?\s*(сынып|класс|class|кл|grade)/) ?? s.match(/(?:^|[^\d-])(\d{1,2})(?!\s*-?\s*топ)(?:\s|$|-|\))/)
  const g = m ? Number(m[1]) : NaN
  if (g >= 1 && g <= 11) return g
  if (/ұбт|ент|ubt/.test(s)) return 11
  if (/нзм|ниш|бил/.test(s)) return 6
  return null
}

const firstToken = (n: string) => low(n).replace(/[^a-zа-яәіңғүұқөһё ]/gi, ' ').trim().split(/\s+/)
/** Айдын ағайдың 5 сыныптағы тобы: Бибі, Алима, Зере (кемі екеуі бар топ). «Айзере», «Айбибі» есептелмейді. */
export function isAidynFifthGroup(names: string[]): boolean {
  const tokens = new Set(names.flatMap(firstToken).map((t) => t.replace(/^биби$/, 'бибі')))
  return ['бибі', 'алима', 'зере'].filter((x) => tokens.has(x)).length >= 2
}

/** Мұғалімді аты немесе пәні бойынша табу */
export function findTeacher(teachers: ATeacher[], key: 'ernar' | 'zholtai' | 'asan' | 'aidyn' | 'akniet' | 'alua' | 'diana' | 'russian'): ATeacher | null {
  const byName = (re: RegExp) => teachers.find((t) => re.test(low(t.name))) ?? null
  switch (key) {
    case 'ernar':
      return byName(/ернар/)
    case 'zholtai':
      return byName(/жолтай/)
    case 'asan':
      return byName(/асан/)
    case 'aidyn':
      return byName(/айдын/)
    case 'akniet':
      return byName(/ақниет|акниет|рамазанова/)
    case 'alua':
      return byName(/алуа/)
    case 'diana':
      return byName(/карабаева|диана/)
    case 'russian':
      return teachers.find((t) => /орыс|русск|russian/.test(low(t.subject))) ?? byName(/орыс тілі|русский/)
  }
}

/** Ереже: пән + сынып (+ топтағы аттар) → мұғалім */
export function ruleFor(subject: SubjKey, grade: number | null, names: string[], teachers: ATeacher[]): { t: ATeacher | null; rule: string } {
  const f = (k: Parameters<typeof findTeacher>[1], rule: string) => ({ t: findTeacher(teachers, k), rule })
  if (subject === 'english') return f('ernar', 'Ағылшын → Ернар')
  if (subject === 'physics') return f('asan', 'Физика → Асан')
  if (subject === 'kazakh') return f('akniet', 'Қазақ тілі → Ақниет Рамазанова')
  if (subject === 'russian') return f('russian', 'Орыс тілі → орыс тілі мұғалімі')
  if (subject === 'history') return f('alua', 'Қазақстан тарихы → Алуа')
  if (subject === 'science') return f('diana', 'Жаратылыстану → Карабаева Диана')
  if (subject === 'math') {
    if (grade === 5 && isAidynFifthGroup(names)) return f('aidyn', '5 сынып (Бибі, Алима, Зере тобы) → Айдын')
    if (grade === 5 || grade === 6) return f('zholtai', 'Математика 5–6 сынып → Жолтай')
    if (grade && [3, 4, 7, 8, 9, 10, 11].includes(grade)) return f('aidyn', `Математика ${grade} сынып → Айдын`)
    return { t: null, rule: 'Сыныбы белгісіз — қолмен таңдаңыз' }
  }
  return { t: null, rule: 'Бұл пәнге ереже жоқ — қолмен таңдаңыз' }
}

export function planAssign(input: { groups: AGroup[]; btGroups: ABtGroup[]; students: AStudent[]; teachers: ATeacher[]; slots: ASlot[] }): AssignRow[] {
  const { groups, btGroups, students, teachers, slots } = input
  const rows: AssignRow[] = []
  for (const g of groups) {
    const members = students.filter((s) => s.group_id === g.id && s.status !== 'left')
    if (!members.length) continue
    const bt = g.bt_group_id ? btGroups.find((b) => b.id === g.bt_group_id) : null
    let subjects: SubjKey[] = []
    let source: AssignRow['source'] = 'guess'
    if (bt?.subjects?.length) {
      subjects = Array.from(new Set(bt.subjects.map((s) => btSubject(s.id)).filter(Boolean) as SubjKey[]))
      source = 'bt'
    }
    if (!subjects.length) {
      subjects = subjectsFromText(g.name)
      if (subjects.length) source = 'name'
    }
    if (!subjects.length) {
      const ts = slots.filter((s) => s.group_id === g.id).map((s) => teachers.find((t) => t.id === s.teacher_id)?.subject ?? '')
      subjects = Array.from(new Set(ts.flatMap((x) => subjectsFromText(x))))
      if (subjects.length) source = 'slot'
    }
    if (!subjects.length && !/жеке/.test(low(g.name))) {
      subjects = ['math'] // сынып бойынша жалпы топтар — негізінен математика (тексеру керек)
      source = 'guess'
    }
    const grade = gradeOfGroup(bt?.name ?? g.name) ?? gradeOfGroup(g.name)
    const names = members.map((m) => m.full_name)
    if (!subjects.length) {
      rows.push({ groupId: g.id, groupName: g.name, students: members.length, subject: 'math', source: 'guess', grade, teacherId: null, rule: '«Жеке пәндер» — әр оқушыны қолмен бөліңіз' })
      continue
    }
    for (const subject of subjects) {
      const r = ruleFor(subject, grade, names, teachers)
      rows.push({ groupId: g.id, groupName: g.name, students: members.length, subject, source, grade, teacherId: r.t?.id ?? null, rule: r.t || !r.rule.includes('→') ? r.rule : `${r.rule} (мұғалім платформада табылмады)` })
    }
  }
  return rows
}
