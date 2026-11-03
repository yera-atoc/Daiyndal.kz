'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CloudSun, Mic, MicOff, Newspaper, RefreshCw, Send, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { almatyHour, greeting, type JarvisData, type JLevel } from '@/lib/jarvis'
import { weatherSentence, type Weather } from '@/lib/weather'
import type { NewsItem } from '@/lib/goodNews'

const C = {
  bg: '#07111F',
  panel: 'rgba(14, 32, 56, 0.72)',
  line: 'rgba(56, 189, 248, 0.22)',
  glow: '#38BDF8',
  text: '#E2F3FF',
  muted: '#7FA3C2',
  red: '#F87171',
  amber: '#FBBF24',
  green: '#34D399',
}

const LEVEL: Record<JLevel, { color: string; label: string }> = {
  high: { color: C.red, label: 'ШҰҒЫЛ' },
  medium: { color: C.amber, label: 'НАЗАР' },
  info: { color: C.glow, label: 'ИНФО' },
}

const QUICK = [
  'Бүгін не істеуім керек?',
  'Ертең ауа райы қандай?',
  'Кімнің төлемі кешікті?',
  'Қай оқушылар кетіп қалуы мүмкін?',
  'Қай мұғалімнің тобы ең жақсы?',
  'Осы айдың түсімін талда',
]

const tg = (n: number) => `${n.toLocaleString('ru-RU')} ₸`
const MONTHS = ['Қаң', 'Ақп', 'Нау', 'Сәу', 'Мам', 'Мау', 'Шіл', 'Там', 'Қыр', 'Қаз', 'Қар', 'Жел']

type Msg = { role: 'user' | 'assistant'; content: string }

/** iPhone (Safari) дауысты тек батырма басқанда іске қосады: алғашқы басуда бос сөйлеммен «ашып» қоямыз,
 * сонда жауап кейін келсе де дауыстап оқылады. */
function unlockSpeech() {
  try {
    if (!window.speechSynthesis) return
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    window.speechSynthesis.speak(u)
  } catch {}
}

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const cyr = /[а-яәғқңөұүһі]/i.test(text)
  const voices = window.speechSynthesis.getVoices()
  u.voice = voices.find((v) => v.lang.startsWith('kk')) ?? voices.find((v) => v.lang.startsWith(cyr ? 'ru' : 'en')) ?? null
  u.lang = u.voice?.lang ?? (cyr ? 'ru-RU' : 'en-US')
  u.rate = 1.02
  window.speechSynthesis.speak(u)
}

export default function Jarvis() {
  const [data, setData] = useState<(JarvisData & { assistant: boolean; weather: Weather | null; name: string }) | null>(null)
  const [news, setNews] = useState<NewsItem[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/jarvis', { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? 'Қате')
      setData(j)
      setError('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/admin/jarvis/news')
      .then((r) => r.json())
      .then((j) => setNews(j.news ?? []))
      .catch(() => setNews([]))
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000) // әр минут сайын жаңартамыз
    return () => clearInterval(t)
  }, [load])

  if (error && !data) return <p className="rounded-2xl p-6 text-sm" style={{ background: C.bg, color: C.red }}>{error}</p>
  if (!data) return <div className="rounded-2xl p-10 text-center text-sm" style={{ background: C.bg, color: C.muted }}>Жүйе іске қосылуда…</div>

  const k = data.kpi
  const revMax = Math.max(1, ...data.revenue6.map((r) => r.value))
  const hello = `${greeting(almatyHour())}, ${data.name}!`
  const wText = weatherSentence(data.weather)
  const speech = () =>
    [
      hello,
      ...data.briefing,
      wText,
      news?.length ? `Бүгінгі жақсы жаңалықтар: ${news.slice(0, 4).map((n) => n.title).join('. ')}.` : '',
      'Сәтті күн тілеймін!',
    ]
      .filter(Boolean)
      .join(' ')
  const attDiff = k.attendance30 != null && k.attendancePrev30 != null ? k.attendance30 - k.attendancePrev30 : null

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-4 md:p-6"
      style={{ background: `radial-gradient(1200px 500px at 70% -10%, rgba(56,189,248,0.18), transparent), ${C.bg}`, color: C.text }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#38BDF8 1px, transparent 1px), linear-gradient(90deg, #38BDF8 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <div className="relative space-y-5">
        {/* Тақырып */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Core />
            <div>
              <div className="font-mono text-xs tracking-[0.3em]" style={{ color: C.glow }}>ONLINE BELES MANAGER</div>
              <div className="text-lg font-semibold">{hello}</div>
            </div>
          </div>
          <button onClick={load} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs" style={{ borderColor: C.line, color: C.muted }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {new Date(data.generatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' })}
          </button>
        </div>

        {/* Брифинг */}
        <Hud title="Күн брифингі" icon={<Sparkles size={14} />} action={
          <button onClick={() => speak(speech())} className="flex items-center gap-1 font-mono text-xs" style={{ color: C.glow }}>
            <Volume2 size={14} /> Тыңдау
          </button>
        }>
          <p className="text-[15px] leading-relaxed">{data.briefing.join(' ')}</p>
        </Hud>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <WeatherCard w={data.weather} />
          <NewsCard news={news} />
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Оқушылар" value={String(k.activeStudents)} sub={k.paused ? `${k.paused} үзілісте` : 'белсенді'} />
          <Stat label="Айдың түсімі" value={tg(k.revenueMonth)} sub={`болжам ${tg(k.revenueForecast)}`} />
          <Stat label="Қарыз" value={tg(k.debt)} sub={`${k.overdue} оқушы`} tone={k.overdue ? C.red : undefined} />
          <Stat label="Қатысу 30 күн" value={k.attendance30 == null ? '—' : `${k.attendance30}%`} sub={attDiff == null ? '' : `${attDiff >= 0 ? '▲' : '▼'} ${Math.abs(attDiff)} алдыңғы айға`} tone={attDiff != null && attDiff < 0 ? C.amber : undefined} />
          <Stat label="Назар керек" value={String(k.atRisk)} sub="оқушы" tone={k.atRisk ? C.amber : undefined} />
          <Stat label="Жаңа өтінім" value={String(k.newLeads)} sub={`7 күнде ${k.leads7}${k.conversion30 != null ? ` · конв. ${k.conversion30}%` : ''}`} tone={k.newLeads ? C.glow : undefined} />
          <Stat label="Бүгін сабақ" value={String(k.lessonsToday)} sub="кесте бойынша" />
          <Stat label="Жүйе, 24 сағ" value={`${k.errors24} қате`} sub={`${k.actions24} әрекет`} tone={k.errors24 >= 5 ? C.red : undefined} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          {/* Дабылдар */}
          <Hud title={`Дабылдар · ${data.alerts.length}`} icon={<Bell size={14} />}>
            {data.alerts.length === 0 ? (
              <p className="text-sm" style={{ color: C.green }}>Барлық жүйе қалыпты жұмыс істеп тұр.</p>
            ) : (
              <ul className="space-y-2">
                {data.alerts.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: `${LEVEL[a.level].color}40`, background: `${LEVEL[a.level].color}0D` }}>
                    <span className="mt-0.5 shrink-0 font-mono text-[10px] font-bold tracking-wider" style={{ color: LEVEL[a.level].color }}>{LEVEL[a.level].label}</span>
                    {a.href ? <a href={a.href} className="flex-1 hover:underline">{a.text}</a> : <span className="flex-1">{a.text}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Hud>

          {/* Бүгінгі сабақтар */}
          <Hud title="Бүгінгі сабақтар">
            {data.lessonsToday.length === 0 ? (
              <p className="text-sm" style={{ color: C.muted }}>Бүгін кестеде сабақ жоқ.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.lessonsToday.map((l, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 font-mono" style={{ color: C.glow }}>{l.time}–{l.end}</span>
                    <span className="min-w-0 flex-1 truncate">{l.title}</span>
                    <span className="truncate text-xs" style={{ color: C.muted }}>{l.teacher}{l.room ? ` · ${l.room}` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </Hud>
        </div>

        {/* Чат */}
        <Assistant enabled={data.assistant} />

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Мұғалімдер */}
          <Hud title="Мұғалімдер">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="font-mono text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>
                    <th className="pb-2 text-left font-normal">Аты</th>
                    <th className="pb-2 text-right font-normal">Оқушы</th>
                    <th className="pb-2 text-right font-normal">Қатысу</th>
                    <th className="pb-2 text-right font-normal">Назар</th>
                    <th className="pb-2 text-right font-normal">Журнал</th>
                  </tr>
                </thead>
                <tbody>
                  {data.teachers.map((t) => (
                    <tr key={t.id} className="border-t" style={{ borderColor: C.line }}>
                      <td className="py-2">
                        <div className="font-medium">{t.name}</div>
                        <div className="text-xs" style={{ color: C.muted }}>{t.subject ?? '—'} · {t.classes} топ</div>
                      </td>
                      <td className="text-right font-mono">{t.students}</td>
                      <td className="text-right font-mono" style={{ color: t.rate == null ? C.muted : t.rate >= 80 ? C.green : t.rate >= 60 ? C.amber : C.red }}>{t.rate == null ? '—' : `${t.rate}%`}</td>
                      <td className="text-right font-mono" style={{ color: t.atRisk ? C.amber : C.muted }}>{t.atRisk}</td>
                      <td className="text-right font-mono" style={{ color: t.unmarked ? C.glow : C.green }}>{t.unmarked ? `−${t.unmarked}` : '✓'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Hud>

          {/* Түсім */}
          <Hud title="Түсім · 6 ай">
            <div className="flex h-40 items-end gap-3">
              {data.revenue6.map((r, i) => (
                <div key={r.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="font-mono text-[10px]" style={{ color: C.muted }}>{r.value ? `${Math.round(r.value / 1000)}к` : ''}</span>
                  <div
                    className="w-full max-w-[44px] rounded-t"
                    style={{
                      height: `${Math.max(2, (r.value / revMax) * 80)}%`,
                      background: i === data.revenue6.length - 1 ? C.glow : 'rgba(56,189,248,0.35)',
                      boxShadow: i === data.revenue6.length - 1 ? `0 0 16px ${C.glow}` : undefined,
                    }}
                  />
                  <span className="font-mono text-[10px]" style={{ color: C.muted }}>{MONTHS[Number(r.month.slice(5, 7)) - 1]}</span>
                </div>
              ))}
            </div>
          </Hud>
        </div>

        {/* Қауіп аймағы */}
        {data.risk.length > 0 && (
          <Hud title={`Қауіп аймағы · ${data.risk.length} оқушы`}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.risk.map((s) => (
                <li key={s.id} className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: `${s.risk === 'high' ? C.red : C.amber}40` }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{s.full_name}</span>
                    <span className="font-mono text-xs" style={{ color: s.risk === 'high' ? C.red : C.amber }}>{s.rate == null ? '—' : `${s.rate}%`}</span>
                  </div>
                  <div className="mt-0.5 text-xs" style={{ color: C.muted }}>{[s.classes.join(', '), s.reasons.join(' · ')].filter(Boolean).join(' — ')}</div>
                </li>
              ))}
            </ul>
          </Hud>
        )}
      </div>
    </div>
  )
}

function Assistant({ enabled }: { enabled: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [voice, setVoice] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const canListen = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  useEffect(() => {
    if (msgs.length) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [msgs, busy])

  async function ask(q: string) {
    const question = q.trim()
    if (!question || busy) return
    const next: Msg[] = [...msgs, { role: 'user', content: question }]
    setMsgs(next)
    setText('')
    setBusy(true)
    try {
      const r = await fetch('/api/admin/jarvis/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next }) })
      const j = await r.json()
      const answer = r.ok ? j.answer : `⚠ ${j.error ?? 'Қате'}`
      setMsgs([...next, { role: 'assistant', content: answer }])
      if (voice && r.ok) speak(answer)
    } catch {
      setMsgs([...next, { role: 'assistant', content: '⚠ Байланыс үзілді' }])
    } finally {
      setBusy(false)
    }
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop()
      return
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    unlockSpeech()
    const rec = new SR()
    rec.lang = 'ru-RU' // қазақ тілін браузерлердің көбі әлі танымайды; орысша сөйлеу ең сенімді
    rec.interimResults = true
    rec.continuous = false
    let finalText = ''
    rec.onresult = (e: any) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      setText(finalText + interim)
    }
    rec.onend = () => {
      setListening(false)
      if (finalText.trim()) {
        setVoice(true)
        ask(finalText)
      }
    }
    rec.onerror = (e: any) => {
      setListening(false)
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed')
        setMsgs((m) => [...m, { role: 'assistant', content: '⚠ Микрофонға рұқсат жоқ. iPhone: Баптаулар → Safari → Микрофон → «Рұқсат ету», және Баптаулар → Жалпы → Пернетақта → «Диктовка» қосулы болсын.' }])
    }
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  return (
    <Hud
      title="Менеджермен сөйлесу"
      icon={<Sparkles size={14} />}
      action={
        <button onClick={() => { if (!voice) unlockSpeech(); else window.speechSynthesis?.cancel(); setVoice(!voice) }} className="flex items-center gap-1 font-mono text-xs" style={{ color: voice ? C.glow : C.muted }}>
          {voice ? <Volume2 size={14} /> : <VolumeX size={14} />} {voice ? 'Дауыс қосулы' : 'Дауыссыз'}
        </button>
      }
    >
      {!enabled ? (
        <p className="text-sm" style={{ color: C.amber }}>Көмекші өшірулі: Vercel-де GEMINI_API_KEY (не ANTHROPIC_API_KEY) айнымалысын қосып, Redeploy басыңыз.</p>
      ) : (
        <>
          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {msgs.length === 0 && (
              <p className="text-sm" style={{ color: C.muted }}>Сәлеметсіз бе! Мен орталықтың барлық деректерін көріп тұрмын — оқушылар, төлемдер, қатысу, мұғалімдер, өтінімдер. Сонымен қатар ауа райы, жаңалық не кез келген басқа сұраққа жауап беремін. Жазыңыз немесе микрофонды басып айтыңыз.</p>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed"
                  style={m.role === 'user' ? { background: C.glow, color: C.bg } : { background: 'rgba(56,189,248,0.08)', border: `1px solid ${C.line}` }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && <div className="font-mono text-xs" style={{ color: C.glow }}>Талдап жатырмын…</div>}
            <div ref={endRef} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button key={q} onClick={() => ask(q)} disabled={busy} className="rounded-full border px-3 py-1 text-xs disabled:opacity-40" style={{ borderColor: C.line, color: C.muted }}>
                {q}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); ask(text) }} className="mt-3 flex items-center gap-2">
            {canListen && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label="Дауыспен сұрау"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: listening ? C.red : 'rgba(56,189,248,0.15)', color: listening ? '#fff' : C.glow, boxShadow: listening ? `0 0 18px ${C.red}` : undefined }}
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={listening ? 'Тыңдап тұрмын…' : 'Мысалы: Айгерімнің қатысуы қалай?'}
              className="h-10 min-w-0 flex-1 rounded-full border bg-transparent px-4 text-sm outline-none"
              style={{ borderColor: C.line, color: C.text }}
            />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Жіберу" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-40" style={{ background: C.glow, color: C.bg }}>
              <Send size={16} />
            </button>
          </form>
        </>
      )}
    </Hud>
  )
}

function WeatherCard({ w }: { w: Weather | null }) {
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`)
  return (
    <Hud title="Жезқазған · ауа райы" icon={<CloudSun size={14} />}>
      {!w?.today ? (
        <p className="text-sm" style={{ color: C.muted }}>Ауа райы дерегі қазір қолжетімсіз.</p>
      ) : (
        <div className="space-y-3">
          {w.now && (
            <div className="flex items-center gap-3">
              <span className="text-4xl">{w.now.icon}</span>
              <div>
                <div className="text-3xl font-semibold tabular-nums">{sign(w.now.temp)}°</div>
                <div className="text-xs" style={{ color: C.muted }}>қазір · {w.now.label}{w.now.wind != null ? ` · жел ${w.now.wind} м/с` : ''}</div>
              </div>
            </div>
          )}
          {[['Бүгін', w.today], ['Ертең', w.tomorrow]].map(([label, d]) =>
            d && typeof d === 'object' ? (
              <div key={label as string} className="flex items-center gap-3 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: C.line }}>
                <span className="w-14 font-mono text-xs" style={{ color: C.glow }}>{label as string}</span>
                <span className="text-xl">{d.icon}</span>
                <span className="min-w-0 flex-1 truncate">{d.label}</span>
                <span className="font-mono tabular-nums">{sign(d.min)}…{sign(d.max)}°</span>
                {d.rain != null && d.rain >= 30 && <span className="font-mono text-xs" style={{ color: C.glow }}>💧{d.rain}%</span>}
              </div>
            ) : null,
          )}
        </div>
      )}
    </Hud>
  )
}

function NewsCard({ news }: { news: NewsItem[] | null }) {
  const groups: [string, NewsItem[]][] = news
    ? [
        ['🇰🇿 Қазақстан', news.filter((n) => n.region === 'kz')],
        ['🌍 Әлем', news.filter((n) => n.region === 'world')],
      ]
    : []
  return (
    <Hud title="Күннің жақсы жаңалықтары" icon={<Newspaper size={14} />}>
      {news === null ? (
        <p className="font-mono text-xs" style={{ color: C.glow }}>Жаңалықтарды іздеп жатырмын…</p>
      ) : news.length === 0 ? (
        <p className="text-sm" style={{ color: C.muted }}>Қазір жаңалық жүктелмеді. Кейінірек қайта көріңіз.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map(([title, items]) =>
            items.length ? (
              <div key={title}>
                <div className="mb-2 text-xs font-semibold" style={{ color: C.muted }}>{title}</div>
                <ul className="space-y-2.5">
                  {items.map((n) => (
                    <li key={n.url}>
                      <a href={n.url} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium leading-snug hover:underline">{n.title}</a>
                      {n.summary && <p className="mt-0.5 text-xs leading-snug" style={{ color: C.muted }}>{n.summary}</p>}
                      {n.source && <p className="mt-0.5 font-mono text-[10px]" style={{ color: C.glow }}>{n.source}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </div>
      )}
    </Hud>
  )
}

function Hud({ title, icon, action, children }: { title: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border p-4 backdrop-blur" style={{ background: C.panel, borderColor: C.line }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: C.glow }}>
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border p-3.5" style={{ background: C.panel, borderColor: tone ? `${tone}66` : C.line, boxShadow: tone ? `inset 0 0 24px ${tone}14` : undefined }}>
      <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums md:text-2xl" style={{ color: tone ?? C.text }}>{value}</div>
      {sub && <div className="mt-0.5 text-xs" style={{ color: C.muted }}>{sub}</div>}
    </div>
  )
}

function Core() {
  return (
    <div className="relative h-11 w-11">
      <div className="absolute inset-0 animate-spin rounded-full border-2 border-dashed" style={{ borderColor: C.glow, animationDuration: '8s' }} />
      <div className="absolute inset-2 rounded-full" style={{ background: `radial-gradient(circle, #E0F7FF 0%, ${C.glow} 45%, transparent 75%)`, boxShadow: `0 0 22px ${C.glow}` }} />
    </div>
  )
}
