'use client'

import { MessageCircle } from 'lucide-react'
import {
  BRAND,
  Badge,
  Empty,
  Kpi,
  Panel,
  btnDark,
  dmy,
  hhmm,
  monthTitle,
  payInfo,
  shiftDays,
  tg,
  waLink,
  weekday,
  type CStudent,
  type CrmData,
} from './core'

export default function Overview({
  data,
  onStudent,
  onPay,
  onAttendance,
  go,
}: {
  data: CrmData
  onStudent: (id: string) => void
  onPay: (id: string) => void
  onAttendance: (groupId: string | null) => void
  go: (view: string) => void
}) {
  const { today, students, payments, attendance, schedule, groups, teachers } = data
  const active = students.filter((s) => (s.status ?? 'active') === 'active')
  const month = today.slice(0, 7)
  const prevMonth = shiftDays(`${month}-01`, -1).slice(0, 7)
  const sumMonth = (ym: string) => payments.filter((p) => p.paid_on.startsWith(ym)).reduce((a, p) => a + (p.amount ?? 0), 0)
  const thisRev = sumMonth(month)
  const lastRev = sumMonth(prevMonth)
  const withPay = active.map((s) => ({ s, p: payInfo(s, today) }))
  const overdue = withPay.filter((x) => x.p.kind === 'overdue').sort((a, b) => (a.p.days ?? 0) - (b.p.days ?? 0))
  const soon = withPay.filter((x) => x.p.kind === 'today' || x.p.kind === 'soon').sort((a, b) => (a.p.days ?? 0) - (b.p.days ?? 0))
  const debt = overdue.reduce((a, x) => a + (x.s.payment_amount ?? 0), 0)
  const noPlan = withPay.filter((x) => x.p.kind === 'none').length

  const from30 = shiftDays(today, -30)
  const att30 = attendance.filter((a) => a.date >= from30 && a.date <= today && !a.excused)
  const attRate = att30.length ? att30.filter((a) => a.present).length / att30.length : null

  const todaySlots = schedule.filter((s) => s.day_of_week === weekday(today)).sort((a, b) => a.start_time.localeCompare(b.start_time))
  const markedToday = new Set(attendance.filter((a) => a.date === today).map((a) => a.student_id))

  // Соңғы 6 айдың түсімі
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(`${month}-01T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() - i)
    months.push(d.toISOString().slice(0, 7))
  }
  const rev = months.map((m) => ({ m, v: sumMonth(m) }))
  const revMax = Math.max(1, ...rev.map((r) => r.v))

  const gName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? '—'
  const tName = (id: string) => teachers.find((t) => t.id === id)?.name ?? '—'

  const remind = (s: CStudent, late: boolean) =>
    waLink(
      s.parent_phone || s.phone,
      late
        ? `Сәлеметсіз бе! Beles education оқу орталығынан жазып отырмыз. ${s.full_name} бойынша ${tg(s.payment_amount)} төлемнің мерзімі ${dmy(s.payment_deadline)} өтіп кетті. Төлем жасауыңызды сұраймыз. Рахмет!`
        : `Сәлеметсіз бе! Beles education: ${s.full_name} бойынша келесі төлем — ${dmy(s.payment_deadline)}, ${tg(s.payment_amount)}. Рахмет!`
    )

  if (!students.length) {
    return (
      <Panel title="Бастау">
        <p className="text-sm" style={{ color: BRAND.muted }}>
          CRM-де әзірге оқушы жоқ. «Оқушылар» бөлімінде қосыңыз немесе Білім тексеру тобынан көшіріп алыңыз.
        </p>
        <button onClick={() => go('students')} className={`${btnDark} mt-4`} style={{ background: BRAND.ink }}>Оқушылар бөліміне өту</button>
      </Panel>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Оқып жүрген оқушылар" value={`${active.length}`} sub={`${students.length - active.length} үзілісте не кеткен`} />
        <Kpi
          label={`${monthTitle(month)} түсімі`}
          value={tg(thisRev)}
          sub={<>өткен айда {tg(lastRev)}</>}
          tone={BRAND.blue}
        />
        <Kpi label="Қарыз" value={tg(debt)} sub={`${overdue.length} оқушының төлемі кешікті`} tone={overdue.length ? BRAND.red : BRAND.text} />
        <Kpi label="Қатысу, 30 күн" value={attRate !== null ? `${Math.round(attRate * 100)} %` : '—'} sub={attRate !== null ? `${att30.length} белгі` : 'Әзірге белгі жоқ'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <Panel
          title="Төлем мерзімі өтті"
          note={overdue.length ? 'Ата-анаға WhatsApp арқылы еске салыңыз' : undefined}
        >
          {overdue.length === 0 ? (
            <Empty>Кешіккен төлем жоқ.</Empty>
          ) : (
            <ul className="divide-y" style={{ borderColor: BRAND.line }}>
              {overdue.slice(0, 8).map(({ s, p }) => {
                const wa = remind(s, true)
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <button onClick={() => onStudent(s.id)} className="min-w-0 flex-1 text-left">
                      <div className="truncate text-sm font-semibold">{s.full_name}</div>
                      <div className="text-xs" style={{ color: BRAND.muted }}>{gName(s.group_id)} · {p.sub}</div>
                    </button>
                    <span className="text-sm font-semibold tabular-nums">{tg(s.payment_amount)}</span>
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`${s.full_name}: WhatsApp`} className="rounded-lg border p-2" style={{ borderColor: BRAND.line, color: '#15803D' }}>
                        <MessageCircle size={16} />
                      </a>
                    )}
                    <button onClick={() => onPay(s.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: BRAND.ink }}>
                      Төлем қабылдау
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {overdue.length > 8 && (
            <button onClick={() => go('students')} className="mt-3 text-sm font-semibold" style={{ color: BRAND.blue }}>Тағы {overdue.length - 8} оқушы</button>
          )}
        </Panel>

        <Panel title="Бүгінгі сабақтар" note={dmy(today)}>
          {todaySlots.length === 0 ? (
            <Empty>Бүгін сабақ жоқ.</Empty>
          ) : (
            <ul className="space-y-2">
              {todaySlots.map((sl) => {
                const roster = active.filter((s) => sl.group_id && s.group_id === sl.group_id)
                const marked = roster.filter((s) => markedToday.has(s.id)).length
                return (
                  <li key={sl.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: BRAND.line }}>
                    <div className="font-display w-14 text-sm font-semibold tabular-nums">{hhmm(sl.start_time)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{sl.title || gName(sl.group_id)}</div>
                      <div className="truncate text-xs" style={{ color: BRAND.muted }}>
                        {tName(sl.teacher_id)}{sl.room ? ` · ${sl.room}` : ''}{sl.group_id && sl.title ? ` · ${gName(sl.group_id)}` : ''}
                      </div>
                    </div>
                    {sl.group_id && (
                      <button onClick={() => onAttendance(sl.group_id)} className="shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold" style={{ borderColor: BRAND.line }}>
                        {roster.length && marked === roster.length ? 'Белгіленді ✓' : `Қатысу ${marked}/${roster.length}`}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Жақын күндері төлейтіндер" note="3 күн ішінде">
          {soon.length === 0 ? (
            <Empty>Жақын күндері төлем жоқ.</Empty>
          ) : (
            <ul className="space-y-2">
              {soon.map(({ s, p }) => {
                const wa = remind(s, false)
                return (
                  <li key={s.id} className="flex items-center gap-2">
                    <button onClick={() => onStudent(s.id)} className="min-w-0 flex-1 truncate text-left text-sm font-medium">{s.full_name}</button>
                    <Badge bg={p.bg} fg={p.fg}>{p.sub}</Badge>
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`${s.full_name}: WhatsApp`} style={{ color: '#15803D' }}>
                        <MessageCircle size={16} />
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Түсім, 6 ай" className="lg:col-span-2">
          <div className="flex h-44 items-end gap-3">
            {rev.map((r) => (
              <div key={r.m} className="flex h-full flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[11px] font-semibold tabular-nums">{r.v ? `${Math.round(r.v / 1000)}к` : ''}</span>
                  <div className="w-full max-w-[56px] rounded-t-md" style={{ height: `${Math.max(2, (r.v / revMax) * 85)}%`, background: r.m === month ? BRAND.blue : BRAND.ink }} />
                </div>
                <span className="text-[11px]" style={{ color: BRAND.muted }}>{monthTitle(r.m).split(' ')[0].slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {noPlan > 0 && (
        <p className="text-sm" style={{ color: BRAND.muted }}>
          {noPlan} оқушыға төлем мерзімі мен сомасы белгіленбеген.{' '}
          <button onClick={() => go('students')} className="font-semibold" style={{ color: BRAND.blue }}>Толтыру</button>
        </p>
      )}
    </div>
  )
}
