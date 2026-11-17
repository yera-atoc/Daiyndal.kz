// Ата-анаға арналған есеп: ортақ типтер мен қорытынды сөйлемдер (клиент + сервер, құпия дерек жоқ).
export type ReportMark = { date: string; score: number; max: number; comment: string | null; topic: string | null }
export type ReportClass = {
  id: string
  name: string
  subject: string | null
  teacher: string
  /** белгі қойылған сабақ саны (себептіден басқа) */
  lessons: number
  present: number
  absent: number
  late: number
  att: number | null
  hw: number | null
  hwNone: number
  /** бағалардың орташасы, пайызбен (әртүрлі шкала болуы мүмкін) */
  markPct: number | null
  marks: ReportMark[]
  quiz: number | null
  topics: { date: string; topic: string }[]
  homework: { date: string; text: string } | null
  next: { date: string; time: string | null } | null
  absStreak: number
}
export type ReportNote = { tone: 'good' | 'warn' | 'bad'; text: string }
export type StudentReport = {
  student: { name: string; grade: number | null; group: string | null }
  from: string
  to: string
  classes: ReportClass[]
  pay: { deadline: string; kind: 'overdue' | 'today' | 'soon' | 'ok'; days: number; amount: number | null } | null
  notes: ReportNote[]
}

const subj = (c: Pick<ReportClass, 'subject' | 'name'>) => c.subject || c.name

/** Бағалардың бағыты: соңғы жартысы алдыңғысынан қаншалықты жоғары/төмен (үлеспен). Кемі 4 баға керек. */
export function markTrend(marks: Pick<ReportMark, 'date' | 'score' | 'max'>[]): number | null {
  const m = [...marks].sort((a, b) => a.date.localeCompare(b.date)).filter((x) => x.max > 0)
  if (m.length < 4) return null
  const half = Math.floor(m.length / 2)
  const avg = (xs: typeof m) => xs.reduce((s, x) => s + x.score / x.max, 0) / xs.length
  return Math.round((avg(m.slice(m.length - half)) - avg(m.slice(0, half))) * 100) / 100
}

/** Қарапайым тілмен қорытынды: алдымен назар аударатыны, сосын жақсысы. */
export function notesOf(classes: ReportClass[]): ReportNote[] {
  const bad: ReportNote[] = []
  const warn: ReportNote[] = []
  const good: ReportNote[] = []
  for (const c of classes) {
    const s = subj(c)
    if (c.absStreak >= 2) bad.push({ tone: 'bad', text: `${s}: соңғы ${c.absStreak} сабаққа қатарынан келмеді` })
    else if (c.att != null && c.lessons >= 3 && c.att < 70) bad.push({ tone: 'bad', text: `${s}: сабақтың ${100 - c.att}%-ын жіберіп алды` })
    else if (c.att != null && c.lessons >= 4 && c.att >= 95) good.push({ tone: 'good', text: `${s}: сабақтан қалмайды` })
    if (c.hw != null && c.hw < 50) warn.push({ tone: 'warn', text: `${s}: үй тапсырмасын жиі орындамайды` })
    else if (c.hw != null && c.hw >= 85) good.push({ tone: 'good', text: `${s}: үй тапсырмасын тұрақты орындайды` })
    const t = markTrend(c.marks)
    if (c.markPct != null && c.markPct < 50) bad.push({ tone: 'bad', text: `${s}: бағалары төмен — қосымша көмек керек` })
    else if (t != null && t <= -0.15) warn.push({ tone: 'warn', text: `${s}: соңғы сабақтарда бағасы төмендеді` })
    else if (t != null && t >= 0.15) good.push({ tone: 'good', text: `${s}: бағалары өсіп келеді` })
    else if (c.markPct != null && c.markPct >= 85) good.push({ tone: 'good', text: `${s}: бағалары жоғары` })
    if (c.quiz != null && c.quiz < 50) warn.push({ tone: 'warn', text: `${s}: сабақ тесттерінде тақырыпты толық меңгермеген` })
  }
  return [...bad, ...warn, ...good].slice(0, 6)
}

/** Мұғалім жіберетін WhatsApp хабарламасы: өз пәні бойынша қысқа қорытынды + толық есептің сілтемесі. */
export function reportMessage(student: string, c: { subject: string | null; att: number | null; hw: number | null; mark: number | null; scale: number }, url: string) {
  const name = student.split(' ').slice(0, 2).join(' ')
  const bits = [c.att != null && `сабаққа қатысу — ${c.att}%`, c.hw != null && `үй тапсырмасы — ${c.hw}%`, c.mark != null && `орташа баға — ${String(c.mark).replace('.', ',')}/${c.scale}`].filter(Boolean)
  return [
    `Сәлеметсіз бе! Beles education.`,
    `${name}${c.subject ? ` · ${c.subject}` : ''}${bits.length ? `, соңғы 30 күн: ${bits.join(', ')}.` : ' бойынша есеп дайын.'}`,
    `Толық есеп (барлық пән, тақырыптар, мұғалім пікірі): ${url}`,
    `Сілтеме тек сізге арналған. Сұрағыңыз болса, жазыңыз!`,
  ].join('\n')
}
