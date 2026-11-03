'use client'
// НИШ «Менің деңгейім»: деңгей, ранг, пән статтары, өсім нүктелері, квесттер, лайфхак және толық дайындық жоспары.
import { useEffect, useState } from 'react'
import type { BoardRow, LevelUp as LU } from '@/lib/levelUp'
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
      <Label>Ранг рейтингі · топ ішінде</Label>
      <div className="space-y-1">
        {shown.map((r, i) => (
          <div key={r.name + i}>
            {!all && i > 0 && rows.indexOf(r) - rows.indexOf(shown[i - 1]) > 1 && <div className="py-0.5 text-center text-xs text-slate-300">⋯</div>}
            <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${r.me ? 'bg-blue-50 font-semibold' : ''}`}>
              <span className="w-6 text-right tabular-nums text-slate-500">{r.place}</span>
              <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${RANK_CLS[r.rank]}`}>{r.rank}</span>
              <span className="min-w-0 flex-1 truncate">{r.name}{r.me ? ' (сен)' : ''}</span>
              <span className="shrink-0 text-xs text-slate-500">Lv {r.level}</span>
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

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${className}`}>{children}</div>
)
const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</div>
)

export function LevelUpTab({ name }: { name: string }) {
  const [data, setData] = useState<LU | null | undefined>(undefined)
  const [err, setErr] = useState('')
  const [plan, setPlan] = useState(false)
  const [board, setBoard] = useState<BoardRow[]>([])

  useEffect(() => {
    fetch('/api/bilim-test/levelup', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Қате')
        setData(j.data)
        setBoard(j.board ?? [])
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

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{initials}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{name}</div>
            <div className="text-xs text-slate-500">{data.monthName} сынағы бойынша{data.streak > 0 ? ` · ${data.streak} күн қатарынан` : ''}</div>
          </div>
          <div className="rounded-xl border-2 border-blue-500 px-3 py-1 text-center">
            <div className="text-xl font-bold leading-none text-blue-600">{data.rank.id}</div>
            <div className="text-[11px] text-slate-500">ранг</div>
          </div>
        </div>
        <div className="mt-4 flex items-baseline justify-between text-sm">
          <span className="text-base font-bold">Lv {data.level}</span>
          <span className="text-slate-500">{data.total} / {data.max} балл</span>
        </div>
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${fill}%` }} />
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {data.toNext > 0 ? `Lv ${data.level + 1}-ге дейін +${data.toNext} балл` : 'Ең жоғарғы деңгей'}
          {data.rank.next ? ` · ${data.rank.next.id} рангқа +${data.rank.next.need}` : ''}
        </div>
        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {data.target.gap > 0
            ? <>Мақсат: НЗМ {data.target.name} гранты ({data.target.min}) — тағы <b>+{data.target.gap}</b> балл</>
            : <>НЗМ {data.target.name} грант шегінен ({data.target.min}) асып тұрсың. Енді 1500-ге!</>}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
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
      </div>

      <Card>
        <Label>Пән статтары</Label>
        <div className="space-y-3">
          {data.subjects.map((s) => (
            <div key={s.id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="shrink-0 text-slate-600">{s.score}/{s.max} · {s.pct}% <Delta v={s.delta} /></span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${bar(s.pct)}`} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

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
            <div key={q.id} className="flex items-center justify-between gap-2">
              <span className={q.done ? 'text-slate-900' : 'text-slate-600'}>
                <span className={`mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${q.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>{q.done ? '✓' : ''}</span>
                {q.title}
              </span>
              <span className="shrink-0 text-xs font-semibold text-slate-500">+{q.xp} XP</span>
            </div>
          ))}
        </div>
      </Card>

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
