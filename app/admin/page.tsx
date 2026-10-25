'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Users,
  UsersRound,
  Wallet,
  Headphones,
} from 'lucide-react'
import { BRAND, dmy, type CrmData } from '@/components/crm/core'
import Overview from '@/components/crm/Overview'
import Students from '@/components/crm/Students'
import { Attendance, Groups, Payments, Schedule, Teachers } from '@/components/crm/Views'

type View = 'overview' | 'students' | 'payments' | 'attendance' | 'schedule' | 'groups' | 'teachers'

const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Шолу', icon: LayoutDashboard },
  { id: 'students', label: 'Оқушылар', icon: Users },
  { id: 'payments', label: 'Төлемдер', icon: Wallet },
  { id: 'attendance', label: 'Қатысу', icon: CalendarCheck },
  { id: 'schedule', label: 'Кесте', icon: CalendarDays },
  { id: 'groups', label: 'Топтар', icon: UsersRound },
  { id: 'teachers', label: 'Мұғалімдер', icon: GraduationCap },
]

function Crm() {
  const sp = useSearchParams()
  const router = useRouter()
  const view = (sp.get('view') as View) || 'overview'
  const [data, setData] = useState<CrmData | null>(null)
  const [msg, setMsg] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [payId, setPayId] = useState<string | null>(null)
  const [attGroup, setAttGroup] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/crm', { cache: 'no-store' })
    setData(await r.json())
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const go = (v: string) => router.push(`/admin?view=${v}`)
  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 2500)
  }

  if (!data) return <p className="p-10 text-center" style={{ color: BRAND.muted }}>Жүктелуде…</p>
  if (data.error) return <p className="p-10 text-center" style={{ color: BRAND.red }}>{data.error}</p>

  const title = NAV.find((n) => n.id === view)?.label ?? 'Шолу'
  const openStudent = (id: string) => {
    if (view !== 'students') go('students')
    setOpenId(id)
  }
  const payStudent = (id: string) => {
    if (view !== 'students') go('students')
    setPayId(id)
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]" style={{ background: BRAND.paper, color: BRAND.text }}>
      <aside className="border-b bg-white md:sticky md:top-0 md:flex md:h-screen md:flex-col md:border-b-0 md:border-r" style={{ borderColor: BRAND.line }}>
        <div className="flex items-center justify-between px-5 py-4 md:block">
          <a href="/admin" aria-label="Шолу"><img src="/beles-logo.png" alt="Beles education" className="h-9 w-auto" /></a>
          <div className="text-xs md:mt-3" style={{ color: BRAND.muted }}>Оқу орталығын басқару</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-0.5" aria-label="Бөлімдер">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = view === id
            return (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={active ? 'page' : undefined}
                className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium md:w-full"
                style={{ background: active ? BRAND.ink : 'transparent', color: active ? '#fff' : BRAND.text }}
              >
                <Icon size={17} />
                {label}
              </button>
            )
          })}
          <div className="hidden px-3 pb-1 pt-4 text-xs md:block" style={{ color: BRAND.muted }}>Оқу сапасы</div>
          <a href="/admin/bilim-test" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium md:w-full" style={{ color: BRAND.text }}>
            <ClipboardList size={17} />
            Білім тексеру
          </a>
          <a href="/ielts/teacher" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium md:w-full" style={{ color: BRAND.text }}>
            <Headphones size={17} />
            IELTS · TOEFL · ҰБТ
          </a>
        </nav>
        <div className="mt-auto hidden px-5 pb-5 md:block">
          <div className="flex h-6 items-stretch gap-[3px]" aria-hidden>
            {[3, 1, 2, 1, 3, 1, 1, 2].map((w, i) => <span key={i} style={{ width: w * 2, background: i % 3 === 2 ? BRAND.blue : BRAND.ink }} />)}
          </div>
          <button
            onClick={async () => {
              await fetch('/api/admin/logout', { method: 'POST' })
              location.href = '/admin/login'
            }}
            className="mt-4 flex items-center gap-2 text-sm"
            style={{ color: BRAND.muted }}
          >
            <LogOut size={15} /> Шығу
          </button>
        </div>
      </aside>

      <main className="min-w-0 px-5 py-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h1>
            <p className="mt-1 text-sm" style={{ color: BRAND.muted }}>Бүгін {dmy(data.today)}</p>
          </div>
        </div>

        {data.missing.length > 0 && (() => {
          // Қай кесте жоқ болса — нақты қай SQL файлын іске қосу керек
          const files = Array.from(new Set(data.missing.map((m) =>
            m.startsWith('crm_attendance') ? 'supabase/migration_crm_attendance.sql'
            : m.startsWith('students') || m.startsWith('student_groups') ? 'supabase/migration_crm_sync.sql'
            : 'supabase/migration_crm.sql')))
          return (
            <div className="mb-5 rounded-2xl border p-4 text-sm" style={{ borderColor: '#FCA5A5', background: '#FEF2F2', color: '#991B1B' }}>
              <b>Дерекқорда кесте не өріс жетіспейді.</b> Supabase → SQL Editor ішінде мына файл(дар)ды іске қосыңыз:{' '}
              {files.map((f, i) => <span key={f}>{i ? ', ' : ''}<code>{f}</code></span>)}
              <details className="mt-1"><summary className="cursor-pointer">Толығырақ</summary><ul className="mt-1 list-disc pl-5">{data.missing.map((m) => <li key={m}>{m}</li>)}</ul></details>
            </div>
          )
        })()}

        {view === 'overview' && (
          <Overview
            data={data}
            onStudent={openStudent}
            onPay={payStudent}
            onAttendance={(g) => {
              setAttGroup(g)
              go('attendance')
            }}
            go={go}
          />
        )}
        {view === 'students' && <Students data={data} reload={load} flash={flash} openId={openId} setOpenId={setOpenId} payId={payId} setPayId={setPayId} />}
        {view === 'payments' && <Payments data={data} reload={load} flash={flash} onStudent={openStudent} />}
        {view === 'attendance' && <Attendance key={attGroup ?? ''} data={data} reload={load} flash={flash} initialGroup={attGroup} />}
        {view === 'schedule' && <Schedule data={data} reload={load} flash={flash} />}
        {view === 'groups' && <Groups data={data} reload={load} flash={flash} onOpenGroup={(id) => { setAttGroup(id); go('attendance') }} />}
        {view === 'teachers' && <Teachers data={data} reload={load} flash={flash} />}
      </main>

      {msg && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm text-white" style={{ background: BRAND.ink }} role="status">{msg}</div>}
    </div>
  )
}

export default function Page() {
  return (
    <>
      <Suspense fallback={null}>
        <Crm />
      </Suspense>
    </>
  )
}
