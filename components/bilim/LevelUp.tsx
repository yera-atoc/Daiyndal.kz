'use client'
// НИШ «Менің деңгейім»: деңгей, ранг, пән статтары, өсім нүктелері, квесттер, лайфхак және толық дайындық жоспары.
import { useEffect, useState } from 'react'
import type { BoardRow, LevelUp as LU } from '@/lib/levelUp'
import type { WeekRow } from '@/lib/xp'

type LevelEvent = { from: number; to: number; rankFrom: string; rankTo: string; rankUp: boolean }
import { NIS_TACTICS, NIS_TIPS, NIS_WEEK } from '@/lib/nisTips'

const bar = (pct: number) =>
  pct >= 85 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-500' : pct >= 55 ? 'bg-amber-500' : 'bg-rose-500'
const chip = (lv: number) =>
  lv >= 4 ? 'bg-emerald-50 text-emerald-700' : lv === 3 ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'

function Delta({ v, unit = '' }: { v: number | null; unit?: string }) {
  if (v === null) return null
  const cls = v > 0 ? 'text-emerald-600' : v < 0 ? 'text-rose-600' : 'text-slate-400'
  return <span className={`text-xs font-semibold ${cls}`}>{v > 0 ? `▲ +${v}` : v < 0 ? `▼ −${Math.abs(v)}` : '0'}{unit}</span>
}

const RANK_CLS: Record<string, string> = {
  S: 'bg-violet-600 text-white',
  A: 'bg-rose-500 text-white',
  B: 'bg-amber-500 text-white',
  C: 'bg-blue-600 text-white',
  D: 'bg-emerald-600 text-white',
  E: 'bg-slate-400 text-white',
}

function Board({ rows }: { rows: BoardRow[] }) {
  const [all, setAll] = useState(false)
  if (rows.length < 2) return null
  const meIdx = rows.findIndex((r) => r.me)
  const shown = all ? rows : rows.filter((r, i) => i < 5 || r.me)
  return (
    <Card>
      <Label>Сынақ рейтингі · ранг бойынша</Label>
      <div className="space-y-1">
        {shown.map((r, i) => (
          <div key={r.name + i}>
            {!all && i > 0 && rows.indexOf(r) - rows.indexOf(shown[i - 1]) > 1 && <div className="py-0.5 text-center text-xs text-slate-300">⋯</div>}
            <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${r.me ? 'bg-blue-50 font-semibold' : ''}`}>
              <span className="w-6 text-right tabular-nums text-slate-500">{r.place}</span>
              <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${RANK_CLS[r.rank]}`}>{r.rank}</span>
              <span className="min-w-0 flex-1 truncate">{r.name}{r.me ? ' (сен)' : ''}</span>
              <span className="w-12 shrink-0 text-right tabular-nums">{r.total}</span>
            </div>
          </div>
        ))}
      </div>
      {rows.length > shown.length || all ? (
        <button onClick={() => setAll(!all)} className="mt-2 w-full text-xs font-semibold text-blue-600">{all ? 'Қысқарту' : `Барлығы (${rows.length})`}</button>
      ) : null}
      {meIdx > 0 && <p className="mt-2 text-xs text-slate-500">Алдыңдағы оқушыдан {rows[meIdx - 1].total - rows[meIdx].total} балл артта.</p>}
    </Card>
  )
}

function SystemWindow({ ev, onClose }: { ev: LevelEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" role="dialog" aria-modal="true">
      <style dangerouslySetInnerHTML={{ __html: '@keyframes sysIn{0%{opacity:0;transform:scale(.85)}100%{opacity:1;transform:scale(1)}}@keyframes rankIn{0%{opacity:0;transform:scale(2.4)}60%{opacity:1;transform:scale(.9)}100%{transform:scale(1)}}' }} />
      <div className="w-full max-w-sm rounded-xl border-2 border-cyan-400 bg-slate-950 p-5 text-center text-white" style={{ animation: 'sysIn .35s ease-out' }}>
        <div className="text-[11px] font-semibold tracking-[.3em] text-cyan-300">ЖҮЙЕ ХАБАРЛАМАСЫ</div>
        <div className="mx-auto my-3 h-px w-2/3 bg-cyan-400/50" />
        {ev.rankUp ? (
          <>
            <div className="text-lg font-semibold">Жаңа ранг алдың!</div>
            <div className="mt-4 flex items-center justify-center gap-4">
              <span className="text-3xl font-bold text-slate-500">{ev.rankFrom}</span>
              <span className="text-cyan-300">→</span>
              <span className="inline-flex h-20 w-20 items-center justify-center rounded-xl border-2 border-cyan-300 text-5xl font-black text-cyan-200" style={{ animation: 'rankIn .9s ease-out' }}>{ev.rankTo}</span>
            </div>
          </>
        ) : (
          <div className="text-lg font-semibold">Деңгей көтерілді!</div>
        )}
        <div className="mt-4 text-2xl font-bold">Lv {ev.from} <span className="text-cyan-300">→</span> Lv {ev.to}</div>
        {ev.to > ev.from && <div className="mt-2 text-sm text-cyan-200">+{ev.to - ev.from} стат ұпайы берілді. Оны пәнге сал.</div>}
        <button onClick={onClose} className="mt-5 w-full rounded-lg border border-cyan-400 py-2.5 text-sm font-semibold text-cyan-100 active:bg-cyan-900">Қабылдау</button>
      </div>
    </div>
  )
}

function Points({ d, busy, onAlloc, onReset }: { d: LU; busy: boolean; onAlloc: (id: string) => void; onReset: () => void }) {
  const p = d.points
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <Label>Стат ұпайлары</Label>
        <span className={`text-xs font-semibold ${p.free > 0 ? 'text-blue-600' : 'text-slate-400'}`}>Бос: {p.free} / {p.total}</span>
      </div>
      <p className="mb-3 text-xs text-slate-500">Әр деңгейде 1 ұпай. Ең көп ұпай салынған пән — фокус пәнің: сол пәннен күнде фокус-квест беріледі.</p>
      <div className="grid grid-cols-2 gap-2">
        {d.subjects.map((s) => (
          <button
            key={s.id}
            disabled={busy || p.free <= 0}
            onClick={() => onAlloc(s.id)}
            className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs ${p.focus === s.id ? 'border-violet-400 bg-violet-50' : 'border-slate-200'} disabled:opacity-100`}
          >
            <span className="truncate font-medium">{s.name}</span>
            <span className="ml-1 shrink-0 font-semibold text-violet-700">{p.spent[s.id] ? `+${p.spent[s.id]}` : ''}{p.free > 0 && <span className="ml-1 text-blue-600">＋</span>}</span>
          </button>
        ))}
      </div>
      {Object.keys(p.spent).length > 0 && (
        <button disabled={busy} onClick={() => confirm('Ұпайларды қайта бөлесің бе?') && onReset()} className="mt-2 text-xs text-slate-400 underline">Қайта бөлу</button>
      )}
    </Card>
  )
}

function Titles({ d }: { d: LU }) {
  const got = d.titles.filter((t) => t.got).length
  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <Label>Атақтар</Label>
        <span className="text-xs text-slate-500">{got} / {d.titles.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {d.titles.map((t) => (
          <div key={t.id} className={`rounded-lg border px-2.5 py-2 ${t.got ? 'border-amber-300 bg-amber-50' : 'border-dashed border-slate-200'}`}>
            <div className={`text-xs font-semibold ${t.got ? 'text-amber-800' : 'text-slate-400'}`}>{t.got ? '★ ' : ''}{t.name}</div>
            <div className="text-[11px] text-slate-400">{t.hint}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>{children}</div>
)
const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</div>
)

type Resp = { data: LU | null; board: BoardRow[]; week: WeekRow[]; event: LevelEvent | null; stored: boolean }
let cache: { at: number; p: Promise<Resp> } | null = null
/** Кабинеттегі жолақ пен «Деңгей» бөлімі бір сұраумен (1 минут кэш) */
export function loadLevelUp(fresh = false): Promise<Resp> {
  if (!fresh && cache && Date.now() - cache.at < 60_000) return cache.p
  const p = fetch('/api/bilim-test/levelup', { cache: 'no-store' }).then(async (r) => {
    const j = await r.json()
    if (!r.ok) throw new Error(j.error || 'Қате')
    return { data: j.data ?? null, board: j.board ?? [], week: j.week ?? [], event: j.event ?? null, stored: j.stored !== false }
  })
  cache = { at: Date.now(), p }
  p.catch(() => (cache = null))
  return p
}

/** Сынақ/күннің сұрақтарынан қайтқанда — XP жаңадан есептелсін */
export function invalidateLevelUp() {
  cache = null
}

/** «Сынақ» бетінің басындағы шағын жолақ: деңгей, XP, бүгін, апталық орын */
export function LevelBanner({ onOpen }: { onOpen: () => void }) {
  const [r, setR] = useState<Resp | null>(null)
  useEffect(() => {
    loadLevelUp().then(setR).catch(() => setR(null))
  }, [])
  if (!r?.data) return null
  const d = r.data
  const me = r.week.find((w) => w.me)
  const pct = Math.round((d.xpBar.into / d.xpBar.need) * 100)
  const daily = d.quests.find((q) => q.id === 'daily')
  return (
    <button onClick={onOpen} className="w-full rounded-2xl bg-slate-950 p-4 text-left text-white active:opacity-90">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-cyan-400">
          <span className="text-[10px] leading-none text-cyan-300">Lv</span>
          <span className="text-lg font-black leading-none">{d.level}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-semibold text-cyan-200">{d.xpBar.into} / {d.xpBar.need} XP</span>
            <span className="text-slate-400">{me ? `Аптада #${me.place} · ${me.xp} XP` : ''}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-cyan-400 transition-[width] duration-1000" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 truncate text-xs text-slate-300">
            {daily && !daily.done ? `Бүгінгі квест: күннің сұрақтары → +${daily.xp} XP-ға дейін` : `Бүгін +${d.xpBar.today} XP · ${d.streak > 0 ? `${d.streak} күн қатарынан` : 'серияны баста'}`}
          </div>
        </div>
        <span className="text-cyan-300">›</span>
      </div>
    </button>
  )
}

function WeekBoard({ rows }: { rows: WeekRow[] }) {
  const [all, setAll] = useState(false)
  if (rows.length < 2) return null
  const shown = all ? rows : rows.filter((r, i) => i < 5 || r.me)
  const me = rows.find((r) => r.me)
  const ahead = me && me.place > 1 ? rows.filter((r) => r.xp > me.xp).slice(-1)[0] : null
  return (
    <Card>
      <div className="mb-1 flex items-center justify-between">
        <Label>Апта чемпионы · XP</Label>
        <span className="text-[11px] text-slate-400">дүйсенбіде нөлден</span>
      </div>
      <div className="space-y-1">
        {shown.map((r, i) => (
          <div key={r.name + i} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${r.me ? 'bg-cyan-50 font-semibold' : ''}`}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${r.place === 1 ? 'bg-amber-400 text-white' : r.place === 2 ? 'bg-slate-300 text-slate-800' : r.place === 3 ? 'bg-orange-300 text-white' : 'text-slate-500'}`}>{r.place}</span>
            <span className="min-w-0 flex-1 truncate">{r.name}{r.me ? ' (сен)' : ''}</span>
            <span className="shrink-0 tabular-nums">{r.xp} XP</span>
          </div>
        ))}
      </div>
      {rows.length > shown.length || all ? (
        <button onClick={() => setAll(!all)} className="mt-2 w-full text-xs font-semibold text-blue-600">{all ? 'Қысқарту' : `Барлығы (${rows.length})`}</button>
      ) : null}
      {ahead && me && <p className="mt-2 text-xs text-slate-500">#{ahead.place} орынға тағы <b>{ahead.xp - me.xp + 1} XP</b> — бұл шамамен {Math.ceil((ahead.xp - me.xp + 1) / 60)} күннің сұрақтары.</p>}
      {me && me.place === 1 && me.xp > 0 && <p className="mt-2 text-xs font-semibold text-amber-600">Сен осы аптаның көшбасшысысың! Орныңды жексенбіге дейін сақта.</p>}
    </Card>
  )
}

export function LevelUpTab({ name }: { name: string }) {
  const [data, setData] = useState<LU | null | undefined>(undefined)
  const [err, setErr] = useState('')
  const [plan, setPlan] = useState(false)
  const [board, setBoard] = useState<BoardRow[]>([])
  const [week, setWeek] = useState<WeekRow[]>([])
  const [event, setEvent] = useState<LevelEvent | null>(null)
  const [stored, setStored] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function act(body: Record<string, string>) {
    setBusy(true)
    setMsg('')
    try {
      const r = await fetch('/api/bilim-test/levelup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Қате')
      setData(j.data)
      setBoard(j.board ?? [])
      setWeek(j.week ?? [])
      cache = null
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    loadLevelUp()
      .then((j) => {
        setData(j.data)
        setBoard(j.board)
        setWeek(j.week)
        setEvent(j.event)
        setStored(j.stored)
      })
      .catch((e) => setErr(e.message))
  }, [])

  if (plan) return <Plan onBack={() => { setPlan(false); window.scrollTo({ top: 0 }) }} />
  if (err) return <Card className="text-sm text-rose-600">{err}</Card>
  if (data === undefined) return <Card className="text-sm text-slate-500">Статтар есептелуде…</Card>
  if (data === null)
    return (
      <div className="space-y-3">
        <Card>
          <div className="font-semibold">Деңгейің әлі ашылмаған</div>
          <p className="mt-1 text-sm text-slate-600">Білім тексеру сынағының нәтижесі жарияланғанда, мұнда деңгейің, рангың және әр пән бойынша өсімің шығады.</p>
        </Card>
        <button onClick={() => setPlan(true)} className="w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold active:bg-slate-100">Толық дайындық жоспары</button>
      </div>
    )

  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const fill = Math.round((data.total / data.max) * 100)

  const myTitle = data.titles.filter((t) => t.got).slice(-1)[0]
  return (
    <div className="space-y-3">
      {event && <SystemWindow ev={event} onClose={() => { setEvent(null); act({ action: 'seen' }) }} />}
      {!stored && <Card className="text-xs text-amber-700">Деңгей мен ұпайлар әлі сақталмайды: әкімші Supabase-те 20261104_03_levelup.sql іске қосуы керек.</Card>}
      {msg && <Card className="text-sm text-rose-600">{msg}</Card>}
      <div className="rounded-2xl bg-slate-950 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-cyan-400">
            <span className="text-[10px] leading-none text-cyan-300">Lv</span>
            <span className="text-2xl font-black leading-none">{data.level}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{name}</div>
            {myTitle && <div className="truncate text-xs font-semibold text-amber-300">★ {myTitle.name}</div>}
            <div className="text-xs text-slate-400">{data.streak > 0 ? `${data.streak} күн қатарынан` : 'Серияны бүгін баста'} · барлығы {data.xpBar.total} XP</div>
          </div>
          {data.hasExam && (
            <div className="rounded-xl border-2 border-cyan-400 px-3 py-1 text-center">
              <div className="text-xl font-black leading-none text-cyan-200">{data.rank.id}</div>
              <div className="text-[11px] text-slate-400">ранг</div>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-baseline justify-between text-xs">
          <span className="font-semibold text-cyan-200">{data.xpBar.into} / {data.xpBar.need} XP</span>
          <span className="text-slate-400">Lv {data.level + 1}-ге дейін +{data.toNext} XP</span>
        </div>
        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-cyan-400 transition-[width] duration-1000" style={{ width: `${Math.round((data.xpBar.into / data.xpBar.need) * 100)}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-900 py-2"><div className="text-lg font-bold text-cyan-200">+{data.xpBar.today}</div><div className="text-[10px] text-slate-400">бүгін XP</div></div>
          <div className="rounded-lg bg-slate-900 py-2"><div className="text-lg font-bold text-cyan-200">{week.find((w) => w.me)?.xp ?? 0}</div><div className="text-[10px] text-slate-400">аптада XP</div></div>
          <div className="rounded-lg bg-slate-900 py-2"><div className="text-lg font-bold text-cyan-200">#{week.find((w) => w.me)?.place ?? '—'}</div><div className="text-[10px] text-slate-400">топта</div></div>
        </div>
        <p className="mt-3 text-[11px] leading-snug text-slate-400">XP: күннің сұрақтары +10, әр дұрыс жауап +2, 3+ күн серия +10, дайындық сынағы +40, айлық сынақ — әр 10 балл +1.</p>
      </div>

      <WeekBoard rows={week} />

      {data.hasExam && (
      <Card>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">{data.monthName} сынағы</span>
          <span className="text-slate-500">{data.total} / {data.max} балл</span>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${fill}%` }} />
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Ранг {data.rank.id} · {data.rank.title}{data.rank.next ? ` · ${data.rank.next.id} рангқа +${data.rank.next.need} балл` : ''}
        </div>
        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {data.target.gap > 0
            ? <>Мақсат: НЗМ {data.target.name} гранты ({data.target.min}) — тағы <b>+{data.target.gap}</b> балл</>
            : <>НЗМ {data.target.name} грант шегінен ({data.target.min}) асып тұрсың. Енді 1500-ге!</>}
        </div>
      </Card>
      )}

      {data.hasExam && <div className="grid grid-cols-2 gap-3">
        <Card className="!p-3">
          <div className="text-xs text-slate-500">Тиімділік</div>
          <div className="text-2xl font-bold">{data.efficiency}%</div>
          <Delta v={data.effDelta} unit="%" />
        </Card>
        <Card className="!p-3">
          <div className="text-xs text-slate-500">Күнделікті дұрыстық</div>
          <div className="text-2xl font-bold">{data.accuracy === null ? '—' : `${data.accuracy}%`}</div>
          <span className="text-xs text-slate-400">соңғы 30 күн</span>
        </Card>
      </div>}

      {data.hasExam && <Card>
        <Label>Пән статтары</Label>
        <div className="space-y-3">
          {data.subjects.map((s) => (
            <div key={s.id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{s.name}{data.points.spent[s.id] ? <span className="ml-1 text-xs font-semibold text-violet-700">+{data.points.spent[s.id]}</span> : null}</span>
                <span className="shrink-0 text-slate-600">{s.score}/{s.max} · {s.pct}% <Delta v={s.delta} /></span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${bar(s.pct)}`} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>}

      <Board rows={board} />

      {data.growth.length > 0 && (
        <Card>
          <Label>Ең тиімді өсім нүктелері</Label>
          <div className="space-y-2 text-sm">
            {data.growth.map((g, i) => (
              <div key={g.id} className="flex justify-between gap-2">
                <span>{i + 1}. {g.name}{g.topic ? ` · ${g.topic}` : ''}</span>
                <span className="shrink-0 font-semibold text-emerald-600">+{g.gain} балл</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Бір айда жоғалған баллдың жартысын қайтаруға болады деп есептелді.</p>
        </Card>
      )}

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <Label>Бүгінгі квесттер</Label>
          <span className="text-xs text-slate-500">{data.xp.got} / {data.xp.of} XP</span>
        </div>
        <div className="space-y-2 text-sm">
          {data.quests.map((q) => (
            <div key={q.id} className={`flex items-center justify-between gap-2 ${q.kind === 'penalty' ? 'rounded-lg bg-rose-50 px-2 py-1.5' : q.kind === 'focus' ? 'rounded-lg bg-violet-50 px-2 py-1.5' : ''}`}>
              <span className={q.kind === 'penalty' && !q.done ? 'text-rose-700' : q.done ? 'text-slate-900' : 'text-slate-600'}>
                <span className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${q.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>{q.done ? '✓' : ''}</span>
                {q.title}
              </span>
              <span className="shrink-0 text-xs font-semibold text-slate-500">{q.kind === 'penalty' ? (q.done ? 'жабылды' : 'міндетті') : `+${q.xp} XP`}</span>
            </div>
          ))}
        </div>
      </Card>

      <Points d={data} busy={busy} onAlloc={(id) => act({ action: 'alloc', subject: id })} onReset={() => act({ action: 'reset' })} />

      <Titles d={data} />

      {data.skills.length > 0 && (
        <Card>
          <Label>Тақырып дағдылары</Label>
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((k) => (
              <span key={k.subject + k.topic} className={`rounded-lg px-2 py-1 text-xs font-medium ${chip(k.level)}`}>{k.topic} Lv{k.level}</span>
            ))}
          </div>
        </Card>
      )}

      <Card className="border-amber-300 bg-amber-50/40">
        <div className="mb-1 text-xs font-semibold text-amber-700">Бүгінгі лайфхак · {data.tip.subjectName}</div>
        <p className="text-sm leading-relaxed">{data.tip.text}</p>
      </Card>

      <button onClick={() => { setPlan(true); window.scrollTo({ top: 0 }) }} className="w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold active:bg-slate-100">Толық дайындық жоспары</button>
    </div>
  )
}

function Plan({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-sm font-semibold text-blue-600">← Деңгейге қайту</button>
      <Card>
        <div className="font-semibold">1500 баллға жол</div>
        <p className="mt-1 text-sm text-slate-600">Математика (400) мен сандық сипаттама (300) — жалпы баллдың жартысы. Грантқа екеуінде де шекті мән міндетті: математика 35 %, сандық 40 %.</p>
      </Card>
      {NIS_TIPS.map((t) => (
        <Card key={t.id}>
          <div className="flex items-baseline justify-between gap-2">
            <div className="font-semibold">{t.name}</div>
            <div className="shrink-0 text-xs text-slate-500">{t.format}</div>
          </div>
          <p className="mt-1 text-sm text-slate-600">{t.why}</p>
          <div className="mt-3 text-xs font-semibold text-slate-500">Қалай дайындалу</div>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{t.plan.map((p) => <li key={p}>{p}</li>)}</ul>
          <div className="mt-3 text-xs font-semibold text-amber-700">Лайфхактар</div>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{t.hacks.map((p) => <li key={p}>{p}</li>)}</ul>
        </Card>
      ))}
      <Card>
        <div className="font-semibold">Апталық режим</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{NIS_WEEK.map((p) => <li key={p}>{p}</li>)}</ul>
      </Card>
      <Card>
        <div className="font-semibold">Емтихан күнгі тактика</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{NIS_TACTICS.map((p) => <li key={p}>{p}</li>)}</ul>
      </Card>
    </div>
  )
}
