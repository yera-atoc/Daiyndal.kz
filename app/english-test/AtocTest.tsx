'use client'

import { useEffect, useState } from 'react'
import { B, waLink } from '@/components/site/brand'
import { inp, lbl } from '@/components/site/forms'
import { ATOC_TESTS, gradeAtoc, type AtocQuestion, type AtocTest as Test } from '@/lib/atocTests'

type Lang = 'kz' | 'ru'
const LETTERS = ['A', 'B', 'C', 'D']

const T = {
  kz: {
    title: 'Ағылшын тілі тесті A1–A2', lead: 'AtoC кітаптары бойынша. Тестті таңда, атыңды жаз да, 30 сұраққа жауап бер. Соңында нәтижең мен қателерің көрсетіледі.',
    name: 'Аты-жөнің', noName: 'Бастау үшін атыңды жаз.', q30: '30 сұрақ', start: 'Бастау →', begin: 'Тестті бастау', back: '← Тесттер',
    of: (i: number, n: number) => `${n} сұрақтың ${i}-сі`, en: 'Бұл сөз нені білдіреді?', tr: 'Ағылшынша қалай болады?', wb: 'Ағылшын тіліне дұрыс аударманы таңда',
    prev: 'Артқа', next: 'Келесі', finish: 'Аяқтау', left: (n: number) => `Жауапсыз қалғаны: ${n}. Бәрібір аяқтау үшін тағы бір рет бас.`,
    correct: 'дұрыс', send: 'Нәтижені WhatsApp арқылы мұғалімге жіберу', again: 'Қайта тапсыру', other: 'Басқа тест',
    all: 'Барлық жауаптар', wrong: 'Тек қателер', your: 'Сенің жауабың', right: 'Дұрысы', none: 'жауап жоқ',
    verdict: [[90, 'Керемет!'], [75, 'Жақсы!'], [50, 'Жаман емес, қате кеткен тақырыптарды қайтала.'], [0, 'Материалды қайталау керек.']] as [number, string][],
  },
  ru: {
    title: 'Тест по английскому A1–A2', lead: 'По книгам AtoC. Выбери тест, впиши имя и ответь на 30 вопросов. В конце увидишь результат и свои ошибки.',
    name: 'Имя и фамилия', noName: 'Впиши имя, чтобы начать.', q30: '30 вопросов', start: 'Начать →', begin: 'Начать тест', back: '← Тесты',
    of: (i: number, n: number) => `Вопрос ${i} из ${n}`, en: 'Что означает это слово?', tr: 'Как это по-английски?', wb: 'Выбери правильный перевод на английский',
    prev: 'Назад', next: 'Дальше', finish: 'Завершить', left: (n: number) => `Без ответа: ${n}. Чтобы всё равно завершить, нажми ещё раз.`,
    correct: 'верно', send: 'Отправить результат учителю в WhatsApp', again: 'Пройти ещё раз', other: 'Другой тест',
    all: 'Все ответы', wrong: 'Только ошибки', your: 'Твой ответ', right: 'Правильно', none: 'нет ответа',
    verdict: [[90, 'Отлично!'], [75, 'Хорошо!'], [50, 'Неплохо, но повтори темы с ошибками.'], [0, 'Нужно повторить материал.']] as [number, string][],
  },
}

const li = (l: Lang) => (l === 'ru' ? 0 : 1)
const optText = (q: AtocQuestion, k: number, l: Lang) => (q.kind === 'en' ? q.opts[k][li(l)] : q.opts[k])
function prompt(q: AtocQuestion, l: Lang): [string, string] {
  const t = T[l]
  if (q.kind === 'en') return [t.en, q.q]
  if (q.kind === 'tr') return [t.tr, q.q[li(l)]]
  return [t.wb, q.q[li(l)]]
}

export default function AtocTest() {
  const [lang, setLang] = useState<Lang>('kz')
  const [test, setTest] = useState<Test | null>(null)
  const [step, setStep] = useState<'pick' | 'name' | 'test' | 'done'>('pick')
  const [name, setName] = useState('')
  const [ans, setAns] = useState<(number | null)[]>([])
  const [i, setI] = useState(0)
  const [err, setErr] = useState('')
  const [warned, setWarned] = useState(false)
  const [onlyWrong, setOnlyWrong] = useState(false)
  const [when, setWhen] = useState('')
  const t = T[lang]

  useEffect(() => {
    try { const s = localStorage.getItem('atoc_lang'); if (s === 'ru' || s === 'kz') setLang(s); setName(localStorage.getItem('atoc_name') || '') } catch {}
  }, [])
  const pickLang = (l: Lang) => { setLang(l); try { localStorage.setItem('atoc_lang', l) } catch {} }

  useEffect(() => {
    if (step !== 'test' || !test) return
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      const k = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()]
      if (k != null) choose(k)
      if (e.key === 'ArrowRight') setI((x) => Math.min(test.questions.length - 1, x + 1))
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const choose = (k: number) => {
    if (!test) return
    setAns((p) => { const n = [...p]; n[i] = k; return n })
    setErr('')
    if (i < test.questions.length - 1) setTimeout(() => setI((x) => Math.min(test.questions.length - 1, x + 1)), 250)
  }

  const begin = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return setErr(t.noName)
    try { localStorage.setItem('atoc_name', name.trim()) } catch {}
    setErr(''); setAns([]); setI(0); setWarned(false); setStep('test'); window.scrollTo({ top: 0 })
  }

  const finish = () => {
    const left = test!.questions.length - ans.filter((a) => a != null).length
    if (left > 0 && !warned) { setWarned(true); return setErr(t.left(left)) }
    const d = new Date()
    setWhen(`${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`)
    setErr(''); setOnlyWrong(false); setStep('done'); window.scrollTo({ top: 0 })
  }

  const LangSwitch = (
    <div className="flex overflow-hidden rounded-full border bg-white text-sm font-semibold" style={{ borderColor: B.line }}>
      {(['kz', 'ru'] as Lang[]).map((l) => (
        <button key={l} onClick={() => pickLang(l)} className="px-4 py-2" style={lang === l ? { background: B.ink, color: '#fff' } : { color: B.muted }}>{l.toUpperCase()}</button>
      ))}
    </div>
  )

  if (step === 'pick')
    return (
      <>
        <div className="flex items-start justify-between gap-4">
          <span className="rounded-md px-2 py-0.5 text-xs font-semibold text-white" style={{ background: B.blue }}>AtoC · A → C</span>
          {LangSwitch}
        </div>
        <h1 className="font-display mt-4 text-[2rem] font-semibold leading-tight sm:text-[2.6rem]">{t.title}</h1>
        <p className="mt-3 max-w-xl leading-relaxed" style={{ color: B.muted }}>{t.lead}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {ATOC_TESTS.map((x, k) => (
            <button key={x.id} onClick={() => { setTest(x); setStep('name') }} className="flex flex-col rounded-2xl border bg-white p-5 text-left transition hover:border-black" style={{ borderColor: B.line }}>
              <span className="self-start rounded-md px-2 py-0.5 text-xs font-semibold text-white" style={{ background: [B.blue, B.red][k % 2] }}>{t.q30}</span>
              <span className="font-display mt-3 text-xl font-semibold">{x.title}</span>
              <span className="mt-1 text-sm" style={{ color: B.muted }}>{x.about[li(lang)]}</span>
              <span className="mt-4 text-sm font-semibold" style={{ color: B.blue }}>{t.start}</span>
            </button>
          ))}
        </div>
      </>
    )

  if (step === 'name')
    return (
      <form onSubmit={begin} className="rounded-3xl border bg-white p-6 sm:p-8" style={{ borderColor: B.line }}>
        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => setStep('pick')} className="-ml-1 text-sm" style={{ color: B.blue }}>{t.back}</button>
          {LangSwitch}
        </div>
        <h1 className="font-display mt-3 text-2xl font-semibold">{test!.title}</h1>
        <p className="mt-1 text-sm" style={{ color: B.muted }}>{test!.about[li(lang)]} · {t.q30}</p>
        <label className={`${lbl} mt-6`}>{t.name} *<input value={name} onChange={(e) => setName(e.target.value)} className={inp} autoComplete="name" /></label>
        {err && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
        <button className="mt-6 w-full rounded-xl py-3.5 font-semibold text-white" style={{ background: B.ink }}>{t.begin}</button>
      </form>
    )

  if (step === 'test') {
    const qs = test!.questions, q = qs[i], filled = ans.filter((a) => a != null).length
    const [p, text] = prompt(q, lang)
    return (
      <>
        <div className="sticky top-16 z-10 -mx-4 border-b bg-[#F5F7FB]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6" style={{ borderColor: B.line }}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <b>{test!.title}</b>
            <div className="flex items-center gap-3"><span className="tabular-nums" style={{ color: B.muted }}>{filled}/{qs.length}</span>{LangSwitch}</div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E3E7F0]"><div className="h-full transition-all" style={{ width: `${(filled / qs.length) * 100}%`, background: B.blue }} /></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-1.5">
          {qs.map((_, k) => (
            <button key={k} onClick={() => setI(k)} aria-label={String(k + 1)} className="grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold transition"
              style={k === i ? { borderColor: B.blue, background: ans[k] != null ? B.blue : '#fff', color: ans[k] != null ? '#fff' : B.blue, boxShadow: '0 0 0 3px rgba(43,107,243,.18)' } : ans[k] != null ? { background: B.ink, borderColor: B.ink, color: '#fff' } : { borderColor: B.line, background: '#fff', color: B.muted }}>
              {k + 1}
            </button>
          ))}
        </div>
        <div key={i} className="mt-5 rounded-3xl border bg-white p-6 sm:p-8" style={{ borderColor: B.line }}>
          <div className="flex justify-between gap-3 text-sm font-medium" style={{ color: B.muted }}>
            <span>{t.of(i + 1, qs.length)}</span><span>{q.kind === 'wb' ? q.topic : q.lvl}</span>
          </div>
          <p className="mt-4 text-sm" style={{ color: B.muted }}>{p}</p>
          <p className="font-display mt-1 text-2xl font-semibold leading-snug sm:text-[1.9rem]">{q.kind === 'wb' ? text : `«${text}»`}</p>
          <div className="mt-6 grid gap-2.5">
            {q.opts.map((_, k) => (
              <button key={k} onClick={() => choose(k)} className={`flex items-center gap-3 rounded-xl border-2 px-3 py-3 text-left text-[1.05rem] transition ${ans[i] === k ? 'border-[#2B6BF3] bg-[#EEF3FE]' : 'border-[#E3E7F0] hover:border-slate-400'}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${ans[i] === k ? 'bg-[#2B6BF3] text-white' : 'bg-slate-100 text-slate-600'}`}>{LETTERS[k]}</span>
                <span>{optText(q, k, lang)}</span>
              </button>
            ))}
          </div>
        </div>
        {err && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{err}</p>}
        <div className="mt-5 flex flex-wrap justify-between gap-3">
          <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className="rounded-xl border bg-white px-5 py-3 text-sm font-semibold disabled:opacity-40" style={{ borderColor: B.line }}>{t.prev}</button>
          <div className="flex gap-3">
            <button onClick={finish} disabled={filled === 0} className="rounded-xl border bg-white px-5 py-3 text-sm font-semibold disabled:opacity-40" style={{ borderColor: B.line }}>{t.finish}</button>
            <button onClick={() => setI(Math.min(qs.length - 1, i + 1))} disabled={i === qs.length - 1} className="rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-40" style={{ background: B.blue }}>{t.next}</button>
          </div>
        </div>
      </>
    )
  }

  const r = gradeAtoc(test!, ans)
  const verdict = t.verdict.find(([min]) => r.pct >= min)![1]
  const msg = `AtoC · ${test!.title}\n${name.trim()} · ${when}\n${r.correct}/${r.total} (${r.pct}%)${r.wrong.length ? `\n✗ ${r.wrong.join(', ')}` : ''}`
  return (
    <>
      <div className="flex justify-end">{LangSwitch}</div>
      <div className="mt-4 rounded-3xl p-6 text-white sm:p-8" style={{ background: B.ink }}>
        <div className="text-sm text-white/60">{name.trim()} · {test!.title} · {when}</div>
        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
          <div className="font-display text-6xl font-semibold tabular-nums">{r.correct}<span className="text-2xl text-white/50"> / {r.total}</span></div>
          <div className="pb-2">
            <div className="text-xl font-semibold">{verdict}</div>
            <div className="text-sm text-white/60">{r.pct}% {t.correct}</div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-10 gap-1.5">
          {test!.questions.map((q, k) => (
            <div key={k} className={`grid h-8 place-items-center rounded-lg text-xs font-semibold ${ans[k] === q.a ? 'bg-emerald-500' : ans[k] != null ? 'bg-red-500' : 'bg-amber-400 text-black'}`}>{k + 1}</div>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <a href={waLink(msg)} target="_blank" rel="noopener noreferrer" className="rounded-xl px-5 py-3 text-center text-sm font-semibold text-white sm:col-span-3" style={{ background: '#16A34A' }}>{t.send}</a>
        <button onClick={() => { setAns([]); setI(0); setWarned(false); setStep('test'); window.scrollTo({ top: 0 }) }} className="rounded-xl border bg-white px-5 py-3 text-sm font-semibold sm:col-span-2" style={{ borderColor: B.line }}>{t.again}</button>
        <button onClick={() => setStep('pick')} className="rounded-xl border bg-white px-5 py-3 text-sm font-semibold" style={{ borderColor: B.line }}>{t.other}</button>
      </div>
      <div className="mt-6 flex gap-2">
        {[false, true].map((w) => (
          <button key={String(w)} onClick={() => setOnlyWrong(w)} className="rounded-full border px-4 py-2 text-sm font-semibold" style={onlyWrong === w ? { background: B.ink, color: '#fff', borderColor: B.ink } : { borderColor: B.line, background: '#fff' }}>
            {w ? `${t.wrong} (${r.wrong.length})` : t.all}
          </button>
        ))}
      </div>
      <ol className="mt-3 space-y-2">
        {test!.questions.map((q, k) => {
          const good = ans[k] === q.a
          if (onlyWrong && good) return null
          const [, text] = prompt(q, lang)
          const yours = ans[k] == null ? t.none : optText(q, ans[k]!, lang)
          return (
            <li key={k} className={`grid grid-cols-[2rem_1fr] gap-x-2 rounded-xl px-4 py-3 text-sm ${good ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <b>{k + 1}</b>
              <span className="font-medium">{q.kind === 'wb' ? text : `«${text}»`}</span>
              <span className="col-start-2 mt-0.5" style={{ color: B.muted }}>
                {good ? <b className="text-emerald-700">{yours}</b> : <>{t.your}: <s className="text-red-600">{yours}</s> · {t.right}: <b className="text-emerald-700">{optText(q, q.a, lang)}</b></>}
              </span>
            </li>
          )
        })}
      </ol>
    </>
  )
}
