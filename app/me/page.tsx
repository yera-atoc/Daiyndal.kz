'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { Cabinet, CabHomework } from '@/lib/cabinetServer'
import { DAY_FULL, dayMonth, weekdayOf } from '@/lib/journal'
import { HW } from '@/lib/lesson'
import { supabase } from '@/lib/supabaseClient'
import LessonQuizzes from '@/components/ielts/LessonQuizzes'

const INK = '#0E1424'
const BLUE = '#2B6BF3'
const MUTED = '#687085'
const LINE = '#E3E7F0'
const PAPER = '#F5F7FB'
const GROUP_KEY = 'beles_me_group'
const TABLET_KEY = 'beles_me_tablet'
const IDLE_MIN = 10

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string, v: string | null) => {
    try {
      v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v)
    } catch {}
  },
}

/** Beles 2.0 · оқушының бірыңғай кабинеті: бір PIN — бүгінгі сабақтар, үй тапсырмасы, тесттер, прогресс */
export default function MePage() {
  const [me, setMe] = useState<Cabinet | null | undefined>(undefined)
  const [err, setErr] = useState('')
  const load = useCallback(async () => {
    const r = await fetch('/api/me', { cache: 'no-store' })
    if (r.status === 401) return setMe(null)
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setErr(j.error || 'Жүктелмеді')
      return setMe(null)
    }
    setErr('')
    setMe(j)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const logout = useCallback(async () => {
    await fetch('/api/me/logout', { method: 'POST' })
    setMe(null)
    window.scrollTo({ top: 0 })
  }, [])

  // Ортақ планшет: 10 минут әрекетсіз тұрса — өзі шығады
  useEffect(() => {
    if (!me || store.get(TABLET_KEY) !== '1') return
    let t = setTimeout(logout, IDLE_MIN * 60_000)
    const reset = () => {
      clearTimeout(t)
      t = setTimeout(logout, IDLE_MIN * 60_000)
    }
    const ev = ['pointerdown', 'keydown', 'scroll']
    ev.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => {
      clearTimeout(t)
      ev.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [me, logout])

  if (me === undefined) return <div className="grid min-h-screen place-items-center text-sm" style={{ background: PAPER, color: MUTED }}>Жүктелуде…</div>
  if (me === null) return <Login onDone={load} note={err} />
  return <Home c={me} onLogout={logout} reload={load} />
}

// ── Кіру: топ → аты → PIN ────────────────────────────────────────────
type LGroup = { id: string; name: string; students: { id: string; name: string; hasPin: boolean }[] }

function Login({ onDone, note }: { onDone: () => void; note?: string }) {
  const [groups, setGroups] = useState<LGroup[] | null>(null)
  const [gid, setGid] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<{ id: string; name: string; hasPin: boolean } | null>(null)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [tablet, setTablet] = useState(false)

  useEffect(() => {
    setTablet(store.get(TABLET_KEY) === '1')
    fetch('/api/me?list=1', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        setGroups(j.groups ?? [])
        const last = store.get(GROUP_KEY)
        if (last && (j.groups ?? []).some((g: LGroup) => g.id === last)) setGid(last)
      })
      .catch(() => setGroups([]))
  }, [])

  const group = groups?.find((g) => g.id === gid) ?? null
  const found = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t || !groups) return []
    return groups.flatMap((g) => g.students.filter((s) => s.name.toLowerCase().includes(t)).map((s) => ({ ...s, group: g.name }))).slice(0, 30)
  }, [q, groups])

  const submit = async (code: string) => {
    if (!sel || code.length !== 4) return
    setBusy(true)
    setErr('')
    try {
      const r = await fetch('/api/ielts/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: sel.id, pin: code }) })
      if (!r.ok) {
        setErr((await r.json().catch(() => ({}))).error || 'PIN қате')
        setPin('')
        return
      }
      if (gid) store.set(GROUP_KEY, gid)
      onDone()
    } finally {
      setBusy(false)
    }
  }
  const press = (d: string) => {
    if (busy) return
    const n = d === '⌫' ? pin.slice(0, -1) : (pin + d).slice(0, 4)
    setPin(n)
    if (n.length === 4) submit(n)
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <header className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" aria-label="Басты бет"><img src="/beles-logo.png" alt="Beles" className="h-7 w-auto" /></Link>
        <Link href="/login" className="text-sm font-medium" style={{ color: MUTED }}>Басқа кабинет</Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-10">
        <h1 className="font-display mt-2 text-2xl font-semibold sm:text-3xl">Менің кабинетім</h1>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>Бір PIN — сабақтар, үй тапсырмасы, тесттер және нәтижелер бір жерде.</p>
        {note && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{note}</p>}

        {sel ? (
          <section className="mx-auto mt-6 max-w-sm rounded-3xl border bg-white p-6 text-center" style={{ borderColor: LINE }}>
            <button onClick={() => { setSel(null); setPin(''); setErr('') }} className="text-sm font-semibold" style={{ color: BLUE }}>← Басқа оқушы</button>
            <div className="mt-3 text-xl font-semibold">{sel.name}</div>
            {sel.hasPin ? (
              <>
                <p className="mt-1 text-sm" style={{ color: MUTED }}>4 таңбалы PIN-ді тер</p>
                <div className="mt-4 flex justify-center gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="grid h-14 w-12 place-items-center rounded-2xl border text-2xl font-bold" style={{ borderColor: pin.length === i ? BLUE : LINE }}>{pin[i] ? '•' : ''}</span>
                  ))}
                </div>
                {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) =>
                    d ? (
                      <button key={i} onClick={() => press(d)} disabled={busy} className="h-16 rounded-2xl text-2xl font-semibold active:scale-95" style={{ background: PAPER }}>{d}</button>
                    ) : (
                      <span key={i} />
                    )
                  )}
                </div>
              </>
            ) : (
              <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Сенде әлі PIN жоқ. Мұғаліміңнен немесе әкімшіден PIN сұра.</p>
            )}
          </section>
        ) : (
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Атыңды іздеу…" className="mt-5 w-full rounded-2xl border bg-white px-4 py-3.5 text-base outline-none focus:border-[#2B6BF3]" style={{ borderColor: LINE }} />
            {q.trim() ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {found.map((s) => (
                  <button key={s.id} onClick={() => setSel(s)} className="flex items-center justify-between rounded-2xl border bg-white px-4 py-3.5 text-left" style={{ borderColor: LINE }}>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs" style={{ color: MUTED }}>{s.group}</span>
                  </button>
                ))}
                {!found.length && <p className="py-6 text-center text-sm sm:col-span-2" style={{ color: MUTED }}>Табылмады</p>}
              </div>
            ) : group ? (
              <>
                <div className="mt-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{group.name}</h2>
                  <button onClick={() => { setGid(null); store.set(GROUP_KEY, null) }} className="text-sm font-semibold" style={{ color: BLUE }}>Басқа топ</button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {group.students.map((s) => (
                    <button key={s.id} onClick={() => setSel(s)} className="rounded-2xl border bg-white px-3 py-5 text-center text-[15px] font-semibold active:scale-[.98]" style={{ borderColor: LINE }}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-5 text-sm font-semibold" style={{ color: MUTED }}>Тобыңды таңда</h2>
                {groups === null && <p className="py-8 text-center text-sm" style={{ color: MUTED }}>Жүктелуде…</p>}
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {groups?.map((g) => (
                    <button key={g.id} onClick={() => setGid(g.id)} className="rounded-2xl border bg-white px-3 py-4 text-left" style={{ borderColor: LINE }}>
                      <span className="block font-semibold">{g.name}</span>
                      <span className="text-xs" style={{ color: MUTED }}>{g.students.length} оқушы</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <label className="mt-6 flex items-center gap-2 text-sm" style={{ color: MUTED }}>
              <input type="checkbox" checked={tablet} onChange={(e) => { setTablet(e.target.checked); store.set(TABLET_KEY, e.target.checked ? '1' : null) }} className="h-4 w-4" />
              Бұл — сыныптағы ортақ планшет ({IDLE_MIN} минут әрекетсіз тұрса, өзі шығады)
            </label>
          </>
        )}
      </main>
    </div>
  )
}

// ── Кабинет ──────────────────────────────────────────────────────────
function Home({ c, onLogout, reload }: { c: Cabinet; onLogout: () => void; reload: () => void }) {
  const first = c.student.full_name.split(' ')[0]
  const todo = c.homework.filter((h) => !h.mark && !h.files.length).length
  const exams = [
    c.exams.bilim && { href: '/bilim-test', title: 'Білім тексеру', text: 'Ай сайынғы сынақ, нәтиже және қатемен жұмыс', color: '#2B6BF3' },
    c.exams.ubt && { href: '/ubt', title: 'ҰБТ сынағы', text: 'Сынақтар және пән тесттері', color: '#5B4CF0' },
    c.exams.ielts && { href: '/ielts', title: 'IELTS', text: 'Mock тест және ИИ-тренажёр', color: '#E5383B' },
    c.exams.toefl && { href: '/toefl', title: 'TOEFL', text: 'Mock тест және ИИ-тренажёр', color: '#0E1424' },
  ].filter(Boolean) as { href: string; title: string; text: string; color: string }[]

  return (
    <div className="min-h-screen pb-10" style={{ background: PAPER, color: INK }}>
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur" style={{ borderColor: LINE }}>
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <img src="/beles-logo.png" alt="Beles" className="h-7 w-auto" />
          <button onClick={onLogout} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: INK }}>Шығу</button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4">
        <section className="mt-4 rounded-3xl p-5 sm:p-6" style={{ background: '#EAF0FE' }}>
          <p className="text-sm font-semibold" style={{ color: BLUE }}>Сәлем, {first}!</p>
          <h1 className="font-display mt-1 text-2xl font-semibold">{DAY_FULL[weekdayOf(c.today) - 1]}, {dayMonth(c.today)}</h1>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>
            {c.lessons.length ? `Бүгін ${c.lessons.length} сабақ` : 'Бүгін сабақ жоқ'}
            {todo > 0 && ` · ${todo} үй тапсырмасы күтіп тұр`}
          </p>
        </section>

        {/* Бүгінгі сабақтар */}
        {c.lessons.length > 0 && (
          <section className="mt-5">
            <h2 className="font-display mb-2 text-lg font-semibold">Бүгінгі сабақтар</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {c.lessons.map((l) => (
                <div key={l.classId} className="flex items-center gap-3 rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
                  <div className="w-16 shrink-0 rounded-xl py-2 text-center" style={{ background: PAPER }}>
                    <div className="text-sm font-bold tabular-nums">{l.time?.split('–')[0] ?? '—'}</div>
                    {l.room && <div className="text-[11px]" style={{ color: MUTED }}>{l.room}</div>}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{l.subject || l.name}</div>
                    <div className="truncate text-[13px]" style={{ color: MUTED }}>{[l.teacher, l.topic].filter(Boolean).join(' · ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Үй тапсырмасы */}
        <section className="mt-5">
          <h2 className="font-display mb-2 text-lg font-semibold">Үй тапсырмасы</h2>
          {!c.homework.length && <p className="rounded-2xl border border-dashed bg-white p-6 text-center text-sm" style={{ borderColor: LINE, color: MUTED }}>Әзірге үй тапсырмасы жоқ.</p>}
          <div className="grid gap-3">
            {c.homework.map((h) => <HomeworkCard key={h.classId} h={h} reload={reload} />)}
          </div>
        </section>

        {/* Сабақ тесттері (мұғалім тақырып бойынша ашқан) */}
        <LessonQuizzes accent={BLUE} />

        {/* Менің прогресім */}
        {c.classes.length > 0 && (
          <section className="mt-5">
            <h2 className="font-display mb-2 text-lg font-semibold">Менің прогресім</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {c.classes.map((k) => (
                <div key={k.id} className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
                  <div className="font-semibold">{k.subject || k.name}</div>
                  <div className="text-[13px]" style={{ color: MUTED }}>
                    {k.teacher}
                    {k.next && ` · келесі сабақ: ${k.next.date === c.today ? 'бүгін' : DAY_FULL[weekdayOf(k.next.date) - 1].toLowerCase()}${k.next.time ? ` ${k.next.time}` : ''}`}
                  </div>
                  <div className="mt-3 space-y-2">
                    <Bar label="Сабаққа келу" v={k.progress.att} />
                    <Bar label="Үй тапсырмасы" v={k.progress.hw} />
                    <Bar label="Сабақ тесттері" v={k.progress.quiz} />
                  </div>
                  {k.progress.absStreak >= 2 && <p className="mt-2 text-xs text-red-700">Соңғы {k.progress.absStreak} сабаққа келмедің — мұғаліммен сөйлес.</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Сынақтар */}
        {exams.length > 0 && (
          <section className="mt-5">
            <h2 className="font-display mb-2 text-lg font-semibold">Сынақтар</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {exams.map((e) => (
                <Link key={e.href} href={e.href} className="flex items-center gap-3 rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
                  <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: e.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{e.title}</span>
                    <span className="block truncate text-[13px]" style={{ color: MUTED }}>{e.text}</span>
                  </span>
                  <span style={{ color: MUTED }}>›</span>
                </Link>
              ))}
            </div>
            <p className="mt-2 text-xs" style={{ color: MUTED }}>Қайта PIN терудің керегі жоқ — кабинеттер бір-бірімен байланған.</p>
          </section>
        )}

        <button onClick={onLogout} className="mt-8 w-full rounded-2xl border bg-white py-4 text-base font-semibold" style={{ borderColor: LINE }}>Шығу</button>
      </main>
    </div>
  )
}

function Bar({ label, v }: { label: string; v: number | null }) {
  const c = v == null ? '#CBD2DE' : v >= 80 ? '#16A34A' : v >= 60 ? '#F59E0B' : '#DC2626'
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span style={{ color: MUTED }}>{label}</span>
        <b className="tabular-nums">{v == null ? '—' : `${v}%`}</b>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full" style={{ background: '#EEF1F6' }}>
        <div className="h-full rounded-full" style={{ width: `${v ?? 0}%`, background: c }} />
      </div>
    </div>
  )
}

/** Суретті кішірейту (1600px, JPEG) — баяу интернетте де тез жүктелсін */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/heic') return file
  const img = await createImageBitmap(file).catch(() => null)
  if (!img) return file
  const k = Math.min(1, 1600 / Math.max(img.width, img.height))
  const cv = document.createElement('canvas')
  cv.width = Math.round(img.width * k)
  cv.height = Math.round(img.height * k)
  cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height)
  return await new Promise((res) => cv.toBlob((b) => res(b ?? file), 'image/jpeg', 0.82))
}

function HomeworkCard({ h, reload }: { h: CabHomework; reload: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const post = async (body: unknown) => {
    const r = await fetch('/api/me', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.error || 'Жіберілмеді')
    return j
  }
  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setErr('')
    try {
      for (const f of Array.from(files).slice(0, 6)) {
        const blob = await shrink(f)
        const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/heic' ? 'heic' : 'jpg'
        const info = await post({ action: 'hwUpload', classId: h.classId, date: h.date, ext })
        const { error } = await supabase.storage.from(info.bucket).uploadToSignedUrl(info.path, info.token, blob, { contentType: blob.type || 'image/jpeg' })
        if (error) throw new Error(error.message)
        await post({ action: 'hwSave', classId: h.classId, date: h.date, ref: info.ref })
      }
      reload()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }
  const del = async (id: string) => {
    try {
      await post({ action: 'hwDelete', id })
      reload()
    } catch (e: any) {
      setErr(e.message)
    }
  }
  const m = h.mark ? HW[h.mark] : null
  return (
    <div className="rounded-2xl border bg-white p-4" style={{ borderColor: LINE }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>{h.subject || h.className} · {dayMonth(h.date)}</div>
          <div className="mt-1 whitespace-pre-wrap text-[15px] font-medium">{h.text}</div>
        </div>
        {m ? (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: m.bg, color: m.fg }}>{m.short} {m.label}</span>
        ) : h.files.length ? (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: '#E0E7FF', color: '#4338CA' }}>Жіберілді</span>
        ) : (
          <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: '#FEF3C7', color: '#B45309' }}>Күтіп тұр</span>
        )}
      </div>
      {h.files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {h.files.map((f) => (
            <div key={f.id} className="relative">
              <a href={f.url} target="_blank" rel="noreferrer"><img src={f.url} alt="Дәптер суреті" className="h-20 w-20 rounded-xl object-cover" /></a>
              {h.canUpload && <button onClick={() => del(f.id)} className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white text-xs shadow" aria-label="Өшіру">✕</button>}
            </div>
          ))}
        </div>
      )}
      {h.canUpload && (
        <>
          <input ref={ref} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => upload(e.target.files)} />
          <button onClick={() => ref.current?.click()} disabled={busy} className="mt-3 w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60" style={{ background: BLUE }}>
            {busy ? 'Жүктелуде…' : h.files.length ? '+ Тағы сурет қосу' : '📷 Дәптерді суретке түсіріп жіберу'}
          </button>
        </>
      )}
      {err && <p className="mt-2 rounded-xl bg-red-50 p-2.5 text-sm text-red-700">{err}</p>}
    </div>
  )
}
