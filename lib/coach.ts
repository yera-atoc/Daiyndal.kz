// НЗМ (6 сынып) оқушысының жеке көмекшісі: оқушының өз деректерінен қысқа анықтама + ИИ-ге ережелер. Таза функциялар.
import type { LevelUp } from './levelUp'
import type { WeekRow } from './xp'
import { NIS_TIPS } from './nisTips'

export const COACH_MAX_MESSAGES = 10
export const COACH_MAX_CHARS = 500

/** Көмекші тек 6-сыныптың НЗМ тобына (5-сыныптың НЗМ тобына емес) */
export function coachAllowed(groupId: string, groupName?: string | null) {
  const name = groupName ?? ''
  const nis = /^nzm/.test(groupId) || /(НЗМ|НИШ)/i.test(name)
  const fifth = groupId === 'nzm5' || /(^|\D)5\s*-?\s*(сынып|кл|класс)/i.test(name)
  return nis && !fifth
}

export const firstName = (full: string) => full.trim().split(/\s+/).slice(-1)[0] || full

/** ИИ-ге берілетін анықтама: тек оқушының өз нәтижелері (телефон, басқа балалардың аты жоқ) */
export function coachContext(o: { name: string; data: LevelUp | null; week: WeekRow[]; examLabel?: string | null; daysLeft?: number | null }): string {
  const d = o.data
  const lines: string[] = [`Оқушының аты: ${firstName(o.name)}. 6-сынып, НЗМ (НИШ) дайындық тобы. Емтихан 1500 балдық.`]
  if (o.examLabel) lines.push(`НЗМ емтиханы: ${o.examLabel}${o.daysLeft != null ? `, ${o.daysLeft} күн қалды` : ''}.`)
  if (!d) return lines.join('\n')
  lines.push(`Деңгей: Lv ${d.level} (${d.xpBar.total} XP, бүгін +${d.xpBar.today} XP). Серия: ${d.streak} күн.`)
  const me = o.week.find((w) => w.me)
  if (me) lines.push(`Осы аптада: ${me.xp} XP, топта ${me.place}-орын (${o.week.length} оқушының ішінде).`)
  if (d.hasExam) {
    lines.push(`Соңғы Білім тексеру (${d.monthName}): ${d.total}/${d.max} балл, тиімділік ${d.efficiency}%${d.totalDelta != null ? `, өткен аймен салыстырғанда ${d.totalDelta >= 0 ? '+' : ''}${d.totalDelta} балл` : ''}. Ранг ${d.rank.id}.`)
    lines.push('Пәндер: ' + d.subjects.map((s) => `${s.name} ${s.score}/${s.max} (${s.pct}%${s.delta != null ? `, ${s.delta >= 0 ? '+' : ''}${s.delta}` : ''})`).join('; ') + '.')
    lines.push(d.target.gap > 0 ? `Мақсат: НЗМ ${d.target.name} гранты ${d.target.min} балл — тағы ${d.target.gap} балл керек.` : `НЗМ ${d.target.name} грант шегінен (${d.target.min}) асқан.`)
    if (d.growth.length) lines.push('Ең көп балл қосатын жерлер: ' + d.growth.map((g) => `${g.name}${g.topic ? ` (${g.topic})` : ''} +${g.gain}`).join('; ') + '.')
  } else lines.push('Айлық Білім тексеру нәтижесі әлі жарияланбаған.')
  const weak = d.skills.filter((k) => k.level <= 2).slice(0, 6)
  if (weak.length) lines.push('Әлсіз тақырыптар: ' + weak.map((k) => `${k.topic} (${k.pct}%)`).join(', ') + '.')
  const strong = d.skills.filter((k) => k.level >= 4).slice(-4)
  if (strong.length) lines.push('Күшті тақырыптар: ' + strong.map((k) => k.topic).join(', ') + '.')
  if (d.accuracy != null) lines.push(`Күннің сұрақтарында соңғы 30 күндегі дұрыстығы: ${d.accuracy}%.`)
  const q = d.quests.find((x) => x.id === 'daily')
  lines.push(q?.done ? 'Бүгінгі күннің сұрақтарын тапсырды.' : 'Бүгінгі күннің сұрақтарын әлі тапсырмаған.')
  const tips = NIS_TIPS.find((t) => t.id === d.tip.subject)
  if (tips) lines.push(`Ең әлсіз пән — ${tips.name} (${tips.format}). Орталықтың кеңестері: ${tips.plan.slice(0, 3).join(' ')}`)
  return lines.join('\n')
}

export function coachSystem(context: string): string {
  return `Сен — Beles education орталығының НЗМ емтиханына дайындық көмекшісісің. Сенімен 11–12 жастағы 6-сынып оқушысы сөйлесіп тұр.

Оқушы туралы деректер (тек осыларға сүйен, жоқ нәтижені ойдан шығарма):
${context}

Ережелер:
- Қазақша жаз. Оқушы орысша жазса — орысша жауап бер.
- Қысқа жаз: 2–6 сөйлем немесе 3–5 тармақ. Балаға түсінікті, жылы, бірақ нақты.
- Деректердегі сандарды қолдан (балл, пайыз, тақырып) және нақты келесі қадам ұсын: бүгін не істеу керек, қанша уақыт.
- Есеп не тақырып сұраса — жауабын бірден айтпа, қадаммен түсіндір, өзі шығаруға көмектес.
- Тек оқу, НЗМ-ге дайындық, уақытты жоспарлау және мотивация туралы сөйлес. Басқа тақырыпқа сыпайы түрде оқуға қайтар.
- Басқа оқушылардың нәтижесін, жеке ақпаратты (телефон, мекенжай, пароль) сұрама және айтпа.
- Бала мұңайып, қорқып немесе біреу ренжітіп жатқанын айтса — жылы сөзбен қолда және мұны ата-анасына не мұғаліміне міндетті түрде айтуға кеңес бер. Терең кеңес берме.
- Білмесең — «мұғаліміңнен сұра» деп айт. Сен ИИ екеніңді жасырма.`
}

/** Клиенттен келген хабарламаларды тазалау: соңғы 10, әрқайсысы 500 таңбаға дейін, соңғысы — оқушыдан */
export function cleanMessages(raw: unknown): { role: 'user' | 'assistant'; content: string }[] {
  if (!Array.isArray(raw)) return []
  const list = raw
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: String(m.content).trim().slice(0, COACH_MAX_CHARS) }))
    .slice(-COACH_MAX_MESSAGES)
  while (list.length && list[0].role !== 'user') list.shift()
  return list.length && list[list.length - 1].role === 'user' ? list : []
}
