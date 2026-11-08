'use client'

import { useCallback, useEffect, useState } from 'react'
import { parentText } from '@/lib/lesson'
import { waPhone } from '@/lib/payments'
import { BRAND, dmy, tg } from './core'
import Today from '@/components/lesson/Today'
import { Sheet, lessonPost } from '@/components/lesson/ui'

type Lesson = { classId: string; name: string; teacher: string; teacherId: string; phone: string | null; time: string | null; students: number; marked: number; done: boolean; topic: string | null }
type Debt = { id: string; name: string; group: string | null; phone: string | null; amount: number | null; deadline: string | null; days: number }
type Watch = { id: string; name: string; phone: string | null; absStreak: number; hwStreak: number; att: number | null; hw: number | null }
type Pay = { id: string; name: string; amount: number | null; date: string; note: string | null; byTeacher: boolean }
type Data = { today: string; lessons: Lesson[]; debts: Debt[]; soon: number; watch: Watch[]; payments: Pay[]; paidToday: number; leads: number; schedule?: { missingToday: number; create: number; update: number }; btLink?: { link: number; create: number; newGroups: number; ambiguous: string[]; error?: string } | null; ktp?: { without: number; matched: number; error?: string } | null }

const wa = (phone: string | null, text: string) => {
  const p = waPhone(phone)
  return p ? `https://wa.me/${p}?text=${encodeURIComponent(text)}` : null
}

/** Әкімшінің басты беті: тек назар керек нәрселер, әрқайсысына бір батырма */
export default function AdminToday({ go }: { go: (view: string) => void }) {
  const [d, setD] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  const [pay, setPay] = useState<Debt | null>(null)
  const [lessonsOpen, setLessonsOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [oldOpen, setOldOpen] = useState(false)
  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 3500)
  }
  const [ktpBusy, setKtpBusy] = useState(false)
  const ktpRun = async () => {
    setKtpBusy(true)
    try {
      const r = await lessonPost('/api/admin/today', { action: 'ktpAll' })
      flash(`${r.done} топқа үлгі КТП қойылды`)
      load()
    } catch (e: any) {
      flash(e.message)
    } finally {
      setKtpBusy(false)
    }
  }
  const [btBusy, setBtBusy] = useState(false)
  const btSync = async () => {
    setBtBusy(true)
    try {
      const r = await lessonPost('/api/admin/today', { action: 'btToCrm' })
      flash(`CRM-ге қосылды: ${r.create} жаңа оқушы${r.link ? `, ${r.link} бұрынғы жазбаға байланды` : ''}${r.newGroups ? `, ${r.newGroups} топ` : ''}`)
      load()
    } catch (e: any) {
      flash(e.message)
    } finally {
      setBtBusy(false)
    }
  }
  const sync = async () => {
    setSyncing(true)
    try {
      const r = await lessonPost('/api/admin/today', { action: 'syncSchedule' })
      flash(`Журналға қосылды: ${r.create} жаңа топ${r.update ? `, ${r.update} топқа күн` : ''}${r.students ? `, ${r.students} оқушы` : ''}`)
      load()
    } catch (e: any) {
      flash(e.message)
    } finally {
      setSyncing(false)
    }
  }

  const load = useCallback(async () => {
    setErr('')
    const r = await fetch('/api/admin/today', { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) return setErr(j.error || 'Жүктелмеді')
    setD(j)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  if (lessonsOpen)
    return (
      <div className="-mt-6">
        <Today admin onExit={() => { setLessonsOpen(false); load() }} />
      </div>
    )
  if (err) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{err}</p>
  if (!d) return <p className="py-16 text-center text-sm" style={{ color: BRAND.muted }}>Жүктелуде…</p>

  const notDone = d.lessons.filter((l) => !l.done)
  const teacherPays = d.payments.filter((p) => p.byTeacher)
  const sch = d.schedule
  const needSync = !!sch && (sch.create > 0 || sch.update > 0)
  const allGood = !notDone.length && !d.debts.length && !d.watch.length && !d.leads && !needSync
  // Қарыздар: жуырда өткендер — бірінші (әрекет керек), ұзақ қарыздар — жиналып тұрады
  const week = d.debts.filter((x) => x.days >= -7)
  const month = d.debts.filter((x) => x.days < -7 && x.days >= -31)
  const old = d.debts.filter((x) => x.days < -31)
  const debtRow = (s: Debt) => {
    const link = wa(s.phone, parentText('pay', s.name, { amount: s.amount, days: s.days }))
    return (
      <Row key={s.id} title={s.name} sub={[s.group, s.amount ? tg(s.amount) : null, s.days === 0 ? 'бүгін' : `${Math.abs(s.days)} күн кешікті`, s.deadline ? `(${dmy(s.deadline)})` : null].filter(Boolean).join(' · ')} bad={s.days < -31}>
        {link && <A href={link} light>Еске салу</A>}
        <button onClick={() => setPay(s)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: '#15803D' }}>Төледі</button>
      </Row>
    )
  }

  return (
    <div className="space-y-5">
      {/* Сандар — әрқайсысы өз бөліміне апарады */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Бүгінгі сабақ" value={`${d.lessons.length - notDone.length}/${d.lessons.length}`} hint="журнал толтырылды" tone={notDone.length ? 'warn' : 'ok'} onClick={() => setLessonsOpen(true)} />
        <Tile label="Қарыз" value={String(d.debts.length)} hint={d.soon ? `тағы ${d.soon} — 3 күнде` : 'төлем күні өткен'} tone={d.debts.length ? 'bad' : 'ok'} onClick={() => go('payments')} />
        <Tile label="Бүгін түсті" value={tg(d.paidToday)} hint={`${d.payments.filter((p) => p.date === d.today).length} төлем`} tone="ok" onClick={() => go('payments')} />
        <Tile label="Жаңа өтінім" value={String(d.leads)} hint="сайттан" tone={d.leads ? 'warn' : 'ok'} onClick={() => go('leads')} />
      </div>

      {allGood && <div className="rounded-2xl bg-emerald-50 p-5 text-center text-sm font-semibold text-emerald-800">Бәрі тәртіпте — бүгін назар аударатын ештеңе жоқ ✓</div>}

      {d.btLink && !d.btLink.error && (d.btLink.create > 0 || d.btLink.link > 0) && (
        <section className="rounded-2xl border p-4" style={{ borderColor: '#BBF7D0', background: '#F0FDF4' }}>
          <h2 className="text-[15px] font-semibold">Білім тексеруде {d.btLink.create + d.btLink.link} оқушы CRM-мен байланбаған</h2>
          <p className="mt-1 text-sm" style={{ color: BRAND.muted }}>
            {d.btLink.create > 0 && `${d.btLink.create} жаңа оқушы қосылады${d.btLink.newGroups ? ` (${d.btLink.newGroups} жаңа топ)` : ''}. `}
            {d.btLink.link > 0 && `${d.btLink.link} оқушы CRM-дегі аттасымен байланады (қайталанбайды). `}
            Тест нәтижелері өзгермейді. Телефон мен төлемді кейін «Оқушылар» бетінде толтырасыз — жаңаларының ескертпесінде «Білім тексеруден қосылды» деп тұрады.
          </p>
          {d.btLink.ambiguous.length > 0 && <p className="mt-1 text-xs" style={{ color: '#B45309' }}>Аттас бірнеше оқушы бар, қолмен тексеріңіз: {d.btLink.ambiguous.join(', ')}</p>}
          <button onClick={btSync} disabled={btBusy} className="mt-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: '#15803D' }}>
            {btBusy ? 'Қосылуда…' : 'CRM-ге қосу'}
          </button>
        </section>
      )}

      {d.ktp && !d.ktp.error && d.ktp.matched > 0 && (
        <section className="rounded-2xl border p-4" style={{ borderColor: '#DDD6FE', background: '#F5F3FF' }}>
          <h2 className="text-[15px] font-semibold">{d.ktp.without} топта КТП жоқ</h2>
          <p className="mt-1 text-sm" style={{ color: BRAND.muted }}>
            {d.ktp.matched} топқа пәні мен сыныбына қарай дайын үлгі қойылады: Қарашадан Мамырға дейін, апта бойынша, әр айдың соңында Білім тексеру. Мұғалім кейін кез келген сабақты өзгерте алады.
            {d.ktp.without > d.ktp.matched ? ` ${d.ktp.without - d.ktp.matched} топқа лайық үлгі табылмады — мұғалім КТП бетінде өзі таңдайды.` : ''}
          </p>
          <button onClick={ktpRun} disabled={ktpBusy} className="mt-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: '#6D28D9' }}>
            {ktpBusy ? 'Қойылуда…' : 'Барлық топқа үлгі КТП қою'}
          </button>
        </section>
      )}

      {needSync && (
        <section className="rounded-2xl border p-4" style={{ borderColor: '#BFDBFE', background: '#EFF6FF' }}>
          <h2 className="text-[15px] font-semibold">Кестедегі сабақтар журналда жоқ</h2>
          <p className="mt-1 text-sm" style={{ color: BRAND.muted }}>
            {sch!.missingToday > 0 ? `Бүгін ${sch!.missingToday} сабақ мұғалімнің «Бүгін» бетіне шықпай тұр. ` : ''}
            Кестеден {sch!.create > 0 ? `${sch!.create} топ құрылады` : ''}{sch!.create > 0 && sch!.update > 0 ? ', ' : ''}{sch!.update > 0 ? `${sch!.update} топқа сабақ күні қосылады` : ''} — оқушылары CRM тобынан өзі қосылады.
          </p>
          <button onClick={sync} disabled={syncing} className="mt-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: BRAND.blue }}>
            {syncing ? 'Қосылуда…' : 'Кестеден журналға қосу'}
          </button>
        </section>
      )}

      {notDone.length > 0 && (
        <Block title="Журнал толтырылмаған сабақтар" note="Мұғалімге WhatsApp арқылы бір басумен еске салыңыз">
          {notDone.map((l) => {
            const link = wa(l.phone, `Сәлеметсіз бе! Бүгінгі «${l.name}» сабағының журналын толтырыңызшы: Бүгін → сабақ → «Сабақты сақтау». Рақмет! — Beles`)
            return (
              <Row key={l.classId} title={l.name} sub={[l.time, l.teacher, l.marked ? `қатысу ${l.marked}/${l.students}` : 'белгі жоқ', l.topic ? null : 'тақырып жоқ'].filter(Boolean).join(' · ')}>
                {link ? <A href={link}>WhatsApp</A> : <span className="text-xs" style={{ color: BRAND.muted }}>тел. жоқ</span>}
              </Row>
            )
          })}
        </Block>
      )}

      {d.debts.length > 0 && (
        <Block title={`Төлемі өткен оқушылар · ${d.debts.length}`} note="Жуырда өткендері жоғарыда. «Төледі» — бір басу; «Еске салу» — ата-анаға дайын хабарлама">
          {week.length > 0 && <Sub label={`Осы аптада · ${week.length}`} />}
          {week.map(debtRow)}
          {month.length > 0 && <Sub label={`1–4 апта бұрын · ${month.length}`} />}
          {month.map(debtRow)}
          {old.length > 0 && (
            <>
              <button onClick={() => setOldOpen(!oldOpen)} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold" style={{ background: '#FEF2F2', color: '#B91C1C' }}>
                <span>1 айдан көп · {old.length}</span>
                <span>{oldOpen ? 'Жасыру ▴' : 'Көрсету ▾'}</span>
              </button>
              {oldOpen && old.map(debtRow)}
              {!oldOpen && <p className="px-4 py-2 text-xs" style={{ color: BRAND.muted }}>Ескі төлем күні жаңартылмаған болуы мүмкін — «Төлемдер» бетінде тексеріңіз.</p>}
            </>
          )}
        </Block>
      )}

      {d.watch.length > 0 && (
        <Block title="Назар аударатын оқушылар" note="Қатарынан келмеген немесе үй тапсырмасын орындамай жүрген — ата-анаға хабар беріңіз">
          {d.watch.map((s) => {
            const kind = s.absStreak >= 2 ? 'absent' : 'homework'
            const link = wa(s.phone, parentText(kind, s.name))
            return (
              <Row key={s.id} title={s.name} sub={[s.absStreak >= 2 ? `${s.absStreak} сабақ қатар келмеді` : null, s.hwStreak >= 3 ? `${s.hwStreak} ҮТ қатар орындамады` : null, s.att != null ? `қатысу ${s.att}%` : null].filter(Boolean).join(' · ')} bad={s.absStreak >= 3}>
                {link ? <A href={link}>Ата-анаға</A> : <span className="text-xs" style={{ color: BRAND.muted }}>тел. жоқ</span>}
              </Row>
            )
          })}
        </Block>
      )}

      {teacherPays.length > 0 && (
        <Block title="Мұғалімдер қабылдаған төлемдер (7 күн)" note="Кассамен салыстыру үшін">
          {teacherPays.map((p) => (
            <Row key={p.id} title={`${p.name} — ${tg(p.amount)}`} sub={[dmy(p.date), p.note].filter(Boolean).join(' · ')} />
          ))}
        </Block>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <a href="/admin/pins" className="rounded-2xl border bg-white p-4 text-sm" style={{ borderColor: BRAND.line }}>
          <b className="block">Кабинетке кіру карточкалары</b>
          <span style={{ color: BRAND.muted }}>Топ бойынша PIN жасау және басып шығару — оқушы «Менің кабинетіме» бір PIN-мен кіреді</span>
        </a>
        <a href="/admin/ktp" className="rounded-2xl border bg-white p-4 text-sm" style={{ borderColor: BRAND.line }}>
          <b className="block">КТП үлгілері</b>
          <span style={{ color: BRAND.muted }}>Барлық пән бойынша апталық жоспар · басып шығару / PDF</span>
        </a>
        <a href="/admin/bilim-test/month" className="rounded-2xl border bg-white p-4 text-sm" style={{ borderColor: BRAND.line }}>
          <b className="block">Айлық Білім тексеру есебі</b>
          <span style={{ color: BRAND.muted }}>Барлық топ · PDF және Excel</span>
        </a>
      </div>

      {pay && (
        <AdminPay
          s={pay}
          onClose={() => setPay(null)}
          onDone={(m) => {
            setPay(null)
            flash(m)
            load()
          }}
        />
      )}
      {toast && <div className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg" style={{ background: BRAND.ink }}>{toast}</div>}
    </div>
  )
}

function Sub({ label }: { label: string }) {
  return <div className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ background: BRAND.paper, color: BRAND.muted }}>{label}</div>
}

function Tile({ label, value, hint, tone, onClick }: { label: string; value: string; hint: string; tone: 'ok' | 'warn' | 'bad'; onClick: () => void }) {
  const c = tone === 'bad' ? '#B91C1C' : tone === 'warn' ? '#B45309' : BRAND.text
  return (
    <button onClick={onClick} className="rounded-2xl border bg-white p-4 text-left transition hover:shadow-sm" style={{ borderColor: BRAND.line }}>
      <div className="text-xs font-medium" style={{ color: BRAND.muted }}>{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: c }}>{value}</div>
      <div className="mt-0.5 truncate text-xs" style={{ color: BRAND.muted }}>{hint}</div>
    </button>
  )
}

function Block({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: BRAND.line }}>
      <div className="border-b px-4 py-3" style={{ borderColor: BRAND.line }}>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {note && <p className="text-xs" style={{ color: BRAND.muted }}>{note}</p>}
      </div>
      <div className="divide-y" style={{ borderColor: BRAND.line }}>{children}</div>
    </section>
  )
}

function Row({ title, sub, bad, children }: { title: string; sub?: string; bad?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderColor: BRAND.line }}>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium" style={{ color: bad ? '#B91C1C' : undefined }}>{title}</div>
        {sub && <div className="truncate text-xs" style={{ color: BRAND.muted }}>{sub}</div>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-1.5">{children}</div>}
    </div>
  )
}

function A({ href, children, light }: { href: string; children: React.ReactNode; light?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: light ? '#F0FDF4' : '#25D366', color: light ? '#15803D' : '#fff' }}>
      {children}
    </a>
  )
}

function AdminPay({ s, onClose, onDone }: { s: Debt; onClose: () => void; onDone: (m: string) => void }) {
  const [amount, setAmount] = useState(s.amount ? String(s.amount) : '')
  const [method, setMethod] = useState<'kaspi' | 'cash' | 'transfer'>('kaspi')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const go = async () => {
    setBusy(true)
    setErr('')
    try {
      const r = await lessonPost('/api/admin/today', { action: 'pay', studentId: s.id, amount: Number(amount.replace(/\D/g, '')), method })
      onDone(`${s.name}: ${tg(r.amount)} жазылды · келесі ${dmy(r.nextDeadline)}`)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet title="Төлем" onClose={onClose}>
      <p className="font-medium">{s.name}</p>
      <p className="text-sm" style={{ color: BRAND.muted }}>{s.group}</p>
      <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-4 w-full rounded-xl border px-3 py-3 text-lg font-semibold tabular-nums" style={{ borderColor: BRAND.line }} placeholder="Сомасы" />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {([['kaspi', 'Kaspi'], ['cash', 'Қолма-қол'], ['transfer', 'Аударым']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setMethod(k)} className="rounded-xl border py-2.5 text-sm font-semibold" style={{ borderColor: method === k ? BRAND.ink : BRAND.line, background: method === k ? BRAND.ink : '#fff', color: method === k ? '#fff' : BRAND.text }}>{l}</button>
        ))}
      </div>
      {err && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <button onClick={go} disabled={busy} className="mt-4 w-full rounded-2xl py-3.5 font-semibold text-white disabled:opacity-60" style={{ background: '#15803D' }}>{busy ? 'Сақталуда…' : 'Төледі — сақтау'}</button>
    </Sheet>
  )
}
