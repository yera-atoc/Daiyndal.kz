'use client'

// Мұғалімнің тест құрастырушысы: Listening (аудио + 4 бөлім), Reading (3 мәтін), Writing (2 тапсырма), Speaking (3 бөлім).
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { emptyContent, emptyToeflContent, sectionsOf, type Exam, type IeltsContent, type IeltsTest, type QGroup, type QItem, type QType } from '@/lib/ielts'
import { BLUE, INK, LINE, MUTED } from './Questions'

export async function tcall(body: unknown) {
  const r = await fetch('/api/ielts/teacher', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || 'Қате')
  return j
}

export async function uploadFile(file: File): Promise<string> {
  const info = await tcall({ action: 'upload-url', fileName: file.name })
  const { error } = await supabase.storage.from('materials').uploadToSignedUrl(info.path, info.token, file, { contentType: file.type || undefined })
  if (error) throw new Error(error.message)
  return info.publicUrl
}

const TYPES: [QType, string, string][] = [
  ['mcq', 'Multiple choice', 'Choose the correct letter, A, B or C.'],
  ['tfng', 'True / False / Not Given', 'Do the following statements agree with the information given in the passage? Write TRUE, FALSE or NOT GIVEN.'],
  ['ynng', 'Yes / No / Not Given', "Do the following statements agree with the claims of the writer? Write YES, NO or NOT GIVEN."],
  ['gap', 'Gap fill / short answer', 'Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.'],
  ['matching', 'Matching', 'Choose the correct letter, A–G.'],
  ['cloze', 'Complete the Words (TOEFL)', 'Fill in the missing letters in the paragraph.'],
  ['order', 'Build a Sentence (TOEFL)', 'Make an appropriate sentence by putting the words in the correct order.'],
]

export const inp = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2B6BF3]'
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean)

/** Сұрақтарды бөлім бойынша 1-ден бастап қайта нөмірлеу */
function renumber(c: IeltsContent): IeltsContent {
  const fix = (gs: QGroup[][]) => {
    let n = 1
    return gs.map((g) => g.map((x) => ({ ...x, items: x.items.map((it) => ({ ...it, n: n++ })) })))
  }
  const lg = fix((c.listening?.parts ?? []).map((p) => p.groups))
  const rg = fix((c.reading?.passages ?? []).map((p) => p.groups))
  const bg = fix([c.writing?.build ?? []])[0]
  return {
    ...c,
    writing: c.writing && { ...c.writing, ...(c.writing.build ? { build: bg } : {}) },
    listening: c.listening && { ...c.listening, parts: c.listening.parts.map((p, i) => ({ ...p, groups: lg[i] })) },
    reading: c.reading && { ...c.reading, passages: c.reading.passages.map((p, i) => ({ ...p, groups: rg[i] })) },
  }
}

type Draft = Pick<IeltsTest, 'title' | 'variant' | 'mode' | 'published' | 'content'> & { id?: string; exam?: Exam }

export default function Builder({ initial, onClose }: { initial: Partial<Draft> | null; onClose: (saved: boolean) => void }) {
  const toefl = initial?.exam === 'toefl'
  const [d, setD] = useState<Draft>(() => {
    if (toefl) {
      const c = initial?.content
      return { id: initial?.id, exam: 'toefl', title: initial?.title ?? '', variant: 'academic', mode: initial?.mode ?? 'exam', published: initial?.published ?? false, content: c && Object.keys(c).length ? c : emptyToeflContent() }
    }
    const base = emptyContent()
    const c = initial?.content ?? {}
    return {
      id: initial?.id,
      title: initial?.title ?? '',
      variant: initial?.variant ?? 'academic',
      mode: initial?.mode ?? 'exam',
      published: initial?.published ?? false,
      content: {
        listening: { ...base.listening!, ...c.listening, parts: base.listening!.parts.map((p, i) => c.listening?.parts?.[i] ?? p) },
        reading: { ...base.reading!, ...c.reading, passages: base.reading!.passages.map((p, i) => c.reading?.passages?.[i] ?? p) },
        writing: { ...base.writing!, ...c.writing },
        speaking: { parts: base.speaking!.parts.map((p, i) => ({ ...p, ...c.speaking?.parts?.[i] })) },
      },
    }
  })
  const [tab, setTab] = useState<'listening' | 'reading' | 'writing' | 'speaking'>('listening')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const c = renumber(d.content)
  const set = (fn: (c: IeltsContent) => IeltsContent) => setD((x) => ({ ...x, content: fn(structuredClone(x.content)) }))

  const save = async (close: boolean) => {
    setBusy(true)
    setMsg('')
    try {
      const j = await tcall({ action: 'save-test', test: { ...d, exam: toefl ? 'toefl' : 'ielts', content: renumber(d.content) } })
      setD((x) => ({ ...x, id: j.id }))
      setMsg('Сақталды ✓')
      if (close) onClose(true)
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }

  const count = (gs: QGroup[]) => gs.reduce((s, g) => s + g.items.length, 0)
  const lCount = (c.listening?.parts ?? []).reduce((s, p) => s + count(p.groups), 0)
  const rCount = (c.reading?.passages ?? []).reduce((s, p) => s + count(p.groups), 0)
  const listParts = <T,>(arr: T[], i: number, fn: (a: T[]) => void) => fn(arr.filter((_, j) => j !== i))

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <button onClick={() => onClose(false)} className="text-sm font-semibold" style={{ color: BLUE }}>← Тесттер</button>
      <div className="mt-3 grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-[1fr_auto_auto_auto]" style={{ borderColor: LINE }}>
        <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="Тесттің аты, мысалы: Mock 1 · Cambridge 18 Test 2" className={inp + ' text-base font-semibold'} />
        {toefl ? (
          <div className="flex items-center rounded-lg border px-3 text-sm font-semibold" style={{ borderColor: LINE }}>TOEFL iBT</div>
        ) : (
          <select value={d.variant} onChange={(e) => setD({ ...d, variant: e.target.value as any })} className={inp}>
            <option value="academic">Academic</option>
            <option value="general">General Training</option>
          </select>
        )}
        <select value={d.mode} onChange={(e) => setD({ ...d, mode: e.target.value as any })} className={inp}>
          <option value="exam">Емтихан режимі</option>
          <option value="practice">Жаттығу (таймерсіз)</option>
        </select>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold">
          <input type="checkbox" checked={d.published} onChange={(e) => setD({ ...d, published: e.target.checked })} className="h-4 w-4 accent-[#2B6BF3]" />
          Оқушыларға ашық
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-1 border-b" style={{ borderColor: LINE }}>
        {([
          ['listening', `Listening · ${lCount}`],
          ['reading', `Reading · ${rCount}`],
          ['writing', 'Writing'],
          ['speaking', 'Speaking'],
        ] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className="-mb-px border-b-2 px-4 py-2 text-sm font-semibold" style={{ borderColor: tab === k ? BLUE : 'transparent', color: tab === k ? BLUE : MUTED }}>{l}</button>
        ))}
        <span className="ml-auto self-center text-xs" style={{ color: MUTED }}>Тестке кіретін бөлімдер: {sectionsOf(c).join(', ') || '—'}</span>
      </div>

      <div className="mt-4 space-y-4">
        {tab === 'listening' && (
          <>
            <Card>
              <div className="grid gap-3 md:grid-cols-[1fr_140px]">
                <FileField label="Аудио (mp3) — 4 бөлімнің бәрі бір файлда" accept="audio/*" value={c.listening?.audio} onChange={(u) => set((x) => ((x.listening!.audio = u), x))} />
                <Num label="Уақыт, мин" value={c.listening!.minutes} onChange={(v) => set((x) => ((x.listening!.minutes = v), x))} />
              </div>
              <p className="mt-2 text-xs" style={{ color: MUTED }}>Ресми емтиханда 30 мин тыңдау + 2 мин тексеру (компьютерлік формат). Емтихан режимінде аудио бір рет ойнайды.</p>
            </Card>
            {c.listening!.parts.map((p, pi) => (
              <Card key={pi} title={toefl ? undefined : p.title || `Part ${pi + 1}`}>
                {toefl && <PartHead value={p.title} onChange={(t) => set((x) => ((x.listening!.parts[pi].title = t), x))} onDelete={() => set((x) => ((x.listening!.parts = x.listening!.parts.filter((_, j) => j !== pi)), x))} />}
                <Groups groups={p.groups} onChange={(g) => set((x) => ((x.listening!.parts[pi].groups = g), x))} />
              </Card>
            ))}
            {toefl && <AddBtn onClick={() => set((x) => (x.listening!.parts.push({ title: 'New part', groups: [] }), x))}>+ Listening бөлімін қосу</AddBtn>}
          </>
        )}

        {tab === 'reading' && (
          <>
            <Card>
              <Num label="Уақыт, мин" value={c.reading!.minutes} onChange={(v) => set((x) => ((x.reading!.minutes = v), x))} />
            </Card>
            {c.reading!.passages.map((p, pi) => (
              <Card key={pi} title={toefl ? undefined : `Passage ${pi + 1}`}>
                {toefl && <div className="mb-2 flex justify-end"><button onClick={() => set((x) => ((x.reading!.passages = x.reading!.passages.filter((_, j) => j !== pi)), x))} className="text-xs text-red-600">Бөлімді өшіру</button></div>}
                <input value={p.title} onChange={(e) => set((x) => ((x.reading!.passages[pi].title = e.target.value), x))} placeholder="Мәтіннің тақырыбы" className={inp + ' font-semibold'} />
                <textarea value={p.text} onChange={(e) => set((x) => ((x.reading!.passages[pi].text = e.target.value), x))} placeholder={toefl ? 'Мәтін (Complete the Words үшін бос қалдырыңыз — абзац сұрақ тобының ішінде жазылады)' : 'Мәтін (абзацтарды A, B, C… деп белгілеуге болады)'} rows={toefl ? 6 : 10} className={inp + ' mt-2 leading-6'} />
                <div className="mt-4"><Groups groups={p.groups} onChange={(g) => set((x) => ((x.reading!.passages[pi].groups = g), x))} /></div>
              </Card>
            ))}
            {toefl && <AddBtn onClick={() => set((x) => (x.reading!.passages.push({ title: 'Read in Daily Life', text: '', groups: [] }), x))}>+ Reading бөлімін қосу</AddBtn>}
          </>
        )}

        {tab === 'writing' && (
          <>
            <Card><Num label="Уақыт, мин" value={c.writing!.minutes} onChange={(v) => set((x) => ((x.writing!.minutes = v), x))} /></Card>
            {toefl && (
              <Card title="Build a Sentence">
                <Groups groups={c.writing!.build ?? []} only={['order']} onChange={(g) => set((x) => ((x.writing!.build = g), x))} />
              </Card>
            )}
            {(['task1', 'task2'] as const).map((k) => (
              <Card key={k} title={toefl ? (k === 'task1' ? 'Write an Email (7 мин)' : 'Write for an Academic Discussion (10 мин)') : k === 'task1' ? 'Task 1' : 'Task 2'}>
                <textarea value={c.writing![k].prompt} onChange={(e) => set((x) => ((x.writing![k].prompt = e.target.value), x))} rows={5} placeholder={k === 'task1' ? 'The chart below shows… Summarise the information by selecting and reporting the main features…' : 'Some people believe that… To what extent do you agree or disagree?'} className={inp} />
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_140px]">
                  {k === 'task1' && !toefl ? <FileField label="Сурет (график, кесте, карта)" accept="image/*" value={c.writing!.task1.image} onChange={(u) => set((x) => ((x.writing!.task1.image = u), x))} /> : <div />}
                  <Num label="Ең аз сөз" value={c.writing![k].minWords} onChange={(v) => set((x) => ((x.writing![k].minWords = v), x))} />
                </div>
              </Card>
            ))}
          </>
        )}

        {tab === 'speaking' && toefl && (
          <>
            {c.speaking!.parts.map((p, pi) => (
              <Card key={pi}>
                <PartHead value={p.title} onChange={(t) => set((x) => ((x.speaking!.parts[pi].title = t), x))} onDelete={() => set((x) => ((x.speaking!.parts = x.speaking!.parts.filter((_, j) => j !== pi)), x))} />
                <div className="mb-3 flex flex-wrap items-end gap-4">
                  <div className="w-36"><Num label="Жазу уақыты, с" value={p.limit ?? 45} onChange={(v) => set((x) => ((x.speaking!.parts[pi].limit = v), x))} /></div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!p.hideText} onChange={(e) => set((x) => ((x.speaking!.parts[pi].hideText = e.target.checked), x))} /> Мәтінді оқушыға көрсетпеу (Listen and Repeat)</label>
                </div>
                <div className="space-y-2">
                  {p.questions.map((q, qi) => (
                    <div key={qi} className="rounded-lg border p-2" style={{ borderColor: LINE }}>
                      <div className="flex gap-2">
                        <span className="pt-2 text-sm font-bold">{qi + 1}</span>
                        <input value={q} onChange={(e) => set((x) => ((x.speaking!.parts[pi].questions[qi] = e.target.value), x))} className={inp} placeholder="Сөйлем / сұрақ" />
                        <button onClick={() => set((x) => { const sp = x.speaking!.parts[pi]; sp.questions.splice(qi, 1); sp.audios?.splice(qi, 1); return x })} className="text-red-500">×</button>
                      </div>
                      <div className="mt-1 pl-5"><FileField label="Аудио (міндетті емес)" accept="audio/*" value={p.audios?.[qi] || undefined} onChange={(u) => set((x) => { const sp = x.speaking!.parts[pi]; sp.audios = sp.audios ?? []; sp.audios[qi] = u ?? ''; return x })} /></div>
                    </div>
                  ))}
                </div>
                <AddBtn onClick={() => set((x) => (x.speaking!.parts[pi].questions.push(''), x))}>+ сұрақ</AddBtn>
              </Card>
            ))}
          </>
        )}

        {tab === 'speaking' && !toefl && c.speaking!.parts.map((p, pi) => (
          <Card key={pi} title={p.title}>
            {pi === 1 && (
              <textarea value={p.cueCard ?? ''} onChange={(e) => set((x) => ((x.speaking!.parts[1].cueCard = e.target.value), x))} rows={6} placeholder={'Describe a place you visited that you particularly liked.\nYou should say:\n– where it is\n– when you went there\n– what you did there\nand explain why you liked it.'} className={inp + ' mb-3'} />
            )}
            <label className="text-xs font-semibold" style={{ color: MUTED }}>{pi === 1 ? 'Cue card-тан кейінгі 1–2 қосымша сұрақ (міндетті емес) — әр жолға бір сұрақ' : 'Сұрақтар — әр жолға бір сұрақ'}</label>
            <textarea
              defaultValue={p.questions.join('\n')}
              onBlur={(e) => set((x) => ((x.speaking!.parts[pi].questions = lines(e.target.value)), x))}
              rows={pi === 1 ? 2 : 6}
              className={inp + ' mt-1'}
            />
            <p className="mt-1 text-xs" style={{ color: MUTED }}>
              {pi === 0 ? 'Әр жауапқа 45 с.' : pi === 1 ? 'Оқушы 1 минут дайындалып, 2 минут сөйлейді.' : 'Әр жауапқа 75 с.'} Жауаптар аудио болып жазылады, оларды «Тексеру» бетінде тыңдайсыз.
            </p>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-0 mt-6 flex items-center gap-3 border-t bg-[#F5F7FB] py-3" style={{ borderColor: LINE }}>
        <span className="text-sm" style={{ color: msg.includes('✓') ? '#15803D' : '#B91C1C' }}>{msg}</span>
        <button disabled={busy} onClick={() => save(false)} className="ml-auto rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold" style={{ borderColor: LINE }}>Сақтау</button>
        <button disabled={busy} onClick={() => save(true)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ background: INK }}>Сақтап, жабу</button>
      </div>
    </div>
  )
}

function PartHead({ value, onChange, onDelete }: { value: string; onChange: (v: string) => void; onDelete: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inp + ' font-semibold'} />
      <button onClick={() => confirm('Бөлімді өшіру керек пе?') && onDelete()} className="whitespace-nowrap text-xs text-red-600">Өшіру</button>
    </div>
  )
}

function AddBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="mt-2 rounded-lg border border-dashed bg-white px-3 py-2 text-sm font-semibold" style={{ borderColor: LINE, color: BLUE }}>{children}</button>
}

/** Complete the Words: мұғалім «cen{ter}» деп жазады → мәтінде [k], сұрақта «cen___» */
function bracesFrom(g: QGroup) {
  return (g.text ?? '').replace(/\[(\d+)\]/g, (_, k) => {
    const it = g.items[Number(k) - 1]
    if (!it) return ''
    const pre = it.prompt.replace(/_+.*$/, '')
    return `${pre}{${(it.answer ?? '').split('|')[0]}}`
  })
}
function clozeFrom(src: string): { text: string; items: QItem[] } {
  const items: QItem[] = []
  const text = src.replace(/([A-Za-z'’-]*)\{([^}]+)\}/g, (_, pre: string, miss: string) => {
    items.push({ n: 0, prompt: pre + '_'.repeat(miss.length), answer: `${miss}|${pre}${miss}` })
    return `[${items.length}]`
  })
  return { text, items }
}
/** Build a Sentence: жауап сөйлемінен сөздерді араластыру */
function shuffleWords(sentence: string) {
  const w = sentence.trim().split(/\s+/).filter(Boolean)
  let seed = w.join(' ').length + 7
  return w.map((x) => ({ x, k: (seed = (seed * 9301 + 49297) % 233280) })).sort((a, b) => a.k - b.k).map((o) => o.x)
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
      {title && <h3 className="mb-3 font-bold">{title}</h3>}
      {children}
    </section>
  )
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs font-semibold" style={{ color: MUTED }}>
      {label}
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className={inp + ' mt-1'} />
    </label>
  )
}

function FileField({ label, accept, value, onChange }: { label: string; accept: string; value?: string; onChange: (u: string | undefined) => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  return (
    <div className="text-xs font-semibold" style={{ color: MUTED }}>
      {label}
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm" style={{ borderColor: LINE, color: INK }}>
          {busy ? 'Жүктелуде…' : value ? 'Ауыстыру' : 'Файл таңдау'}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setBusy(true)
              setErr('')
              try {
                onChange(await uploadFile(f))
              } catch (x: any) {
                setErr(x.message)
              } finally {
                setBusy(false)
              }
            }}
          />
        </label>
        {value && <button onClick={() => onChange(undefined)} className="text-sm text-red-600">Өшіру</button>}
      </div>
      {value && (accept.startsWith('audio') ? <audio src={value} controls className="mt-2 w-full" /> : <img src={value} alt="" className="mt-2 max-h-48 rounded border" />)}
      {err && <p className="mt-1 text-red-600">{err}</p>}
    </div>
  )
}

function Groups({ groups, onChange, only }: { groups: QGroup[]; onChange: (g: QGroup[]) => void; only?: QType[] }) {
  const upd = (i: number, g: QGroup) => onChange(groups.map((x, j) => (j === i ? g : x)))
  const add = (type: QType) =>
    onChange([...groups, { type, instructions: TYPES.find((t) => t[0] === type)![2], ...(type === 'matching' ? { options: [] } : {}), ...(type === 'cloze' ? { text: '' } : {}), items: type === 'cloze' ? [] : [{ n: 0, prompt: '', answer: '', ...(type === 'mcq' || type === 'order' ? { options: [] } : {}) }] }])
  return (
    <div className="space-y-4">
      {groups.map((g, gi) => {
        const first = g.items[0]?.n
        const last = g.items[g.items.length - 1]?.n
        return (
          <div key={gi} className="rounded-xl border p-4" style={{ borderColor: LINE, background: '#FAFBFD' }}>
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-sm">Questions {first}{last !== first ? `–${last}` : ''}</b>
              <span className="rounded bg-white px-2 py-0.5 text-xs" style={{ color: MUTED }}>{TYPES.find((t) => t[0] === g.type)?.[1]}</span>
              <button onClick={() => gi > 0 && onChange(groups.map((x, j) => (j === gi - 1 ? g : j === gi ? groups[gi - 1] : x)))} className="ml-auto text-xs" style={{ color: MUTED }}>↑</button>
              <button onClick={() => confirm('Топты өшіру керек пе?') && onChange(groups.filter((_, j) => j !== gi))} className="text-xs text-red-600">Топты өшіру</button>
            </div>
            <textarea value={g.instructions} onChange={(e) => upd(gi, { ...g, instructions: e.target.value })} rows={2} className={inp + ' mt-2'} placeholder="Нұсқау" />
            {g.type === 'cloze' && (
              <>
                <label className="mt-2 block text-xs font-semibold" style={{ color: MUTED }}>Абзац. Жетпейтін әріптерді жақшаға алыңыз: «The sun is the cen{'{'}ter{'}'} of our solar sys{'{'}tem{'}'}.»</label>
                <textarea
                  defaultValue={bracesFrom(g)}
                  onBlur={(e) => { const r = clozeFrom(e.target.value); upd(gi, { ...g, text: r.text, items: r.items }) }}
                  rows={6}
                  className={inp + ' mt-1 leading-6'}
                />
                <p className="mt-1 text-xs" style={{ color: MUTED }}>{g.items.length} сөз белгіленді</p>
              </>
            )}
            {g.type === 'matching' && (
              <>
                <label className="mt-2 block text-xs font-semibold" style={{ color: MUTED }}>Ортақ тізім — әр жолға біреуі: «A Coastal erosion»</label>
                <textarea defaultValue={(g.options ?? []).join('\n')} onBlur={(e) => upd(gi, { ...g, options: lines(e.target.value) })} rows={4} className={inp + ' mt-1'} />
              </>
            )}
            {g.type !== 'cloze' && <div className="mt-3 space-y-2">
              {g.items.map((it, ii) => (
                <div key={ii} className="grid gap-2 rounded-lg bg-white p-2 md:grid-cols-[36px_1fr_180px_28px]">
                  <span className="pt-2 text-center text-sm font-bold">{it.n}</span>
                  <div>
                    <input
                      value={it.prompt}
                      onChange={(e) => upd(gi, { ...g, items: g.items.map((x, j) => (j === ii ? { ...x, prompt: e.target.value } : x)) })}
                      placeholder={g.type === 'gap' ? 'The museum opens at ___ on Sundays.' : 'Сұрақ / тұжырым'}
                      className={inp}
                    />
                    {g.type === 'mcq' && (
                      <textarea
                        defaultValue={(it.options ?? []).join('\n')}
                        onBlur={(e) => upd(gi, { ...g, items: g.items.map((x, j) => (j === ii ? { ...x, options: lines(e.target.value) } : x)) })}
                        rows={3}
                        placeholder={'A in the morning\nB at lunchtime\nC in the evening'}
                        className={inp + ' mt-1'}
                      />
                    )}
                  </div>
                  <input
                    value={it.answer ?? ''}
                    onChange={(e) => upd(gi, { ...g, items: g.items.map((x, j) => (j === ii ? { ...x, answer: e.target.value, ...(g.type === 'order' ? { options: shuffleWords(e.target.value.split('|')[0]) } : {}) } : x)) })}
                    placeholder={g.type === 'order' ? 'Дұрыс сөйлем' : g.type === 'tfng' ? 'TRUE / FALSE / NOT GIVEN' : g.type === 'ynng' ? 'YES / NO / NOT GIVEN' : g.type === 'gap' ? 'Жауап (нұсқалар: 9am | 9 am)' : 'Әріп: B'}
                    className={inp + ' font-semibold'}
                    style={{ color: '#15803D' }}
                    aria-label={`Answer ${it.n}`}
                  />
                  <button onClick={() => upd(gi, { ...g, items: g.items.filter((_, j) => j !== ii) })} className="text-red-500" aria-label="Өшіру">×</button>
                </div>
              ))}
            </div>}
            {g.type !== 'cloze' && <button onClick={() => upd(gi, { ...g, items: [...g.items, { n: 0, prompt: '', answer: '', ...(g.type === 'mcq' || g.type === 'order' ? { options: [] } : {}) }] })} className="mt-2 text-sm font-semibold" style={{ color: BLUE }}>+ сұрақ</button>}
            {g.type !== 'mcq' && g.type !== 'cloze' && g.type !== 'order' && <BulkAdd onAdd={(rows) => upd(gi, { ...g, items: [...g.items.filter((x) => x.prompt || x.answer), ...rows.map(([p, a]) => ({ n: 0, prompt: p, answer: a }))] })} />}
          </div>
        )
      })}
      <div className="flex flex-wrap gap-2">
        <span className="self-center text-xs font-semibold" style={{ color: MUTED }}>Сұрақ тобын қосу:</span>
        {TYPES.filter(([t]) => (only ? only.includes(t) : true)).map(([t, l]) => (
          <button key={t} onClick={() => add(t)} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold" style={{ borderColor: LINE }}>+ {l}</button>
        ))}
      </div>
    </div>
  )
}

/** Бірнеше сұрақты бірден қою: әр жол «сұрақ ;; жауап» */
function BulkAdd({ onAdd }: { onAdd: (rows: [string, string][]) => void }) {
  const [open, setOpen] = useState(false)
  const [t, setT] = useState('')
  if (!open) return <button onClick={() => setOpen(true)} className="ml-4 mt-2 text-sm" style={{ color: MUTED }}>Тізіммен қою</button>
  return (
    <div className="mt-2">
      <textarea value={t} onChange={(e) => setT(e.target.value)} rows={5} className={inp} placeholder={'Әр жолға: сұрақ ;; жауап\nThe library was founded in ___ ;; 1925\nVisitors must show a ___ card ;; library'} />
      <div className="mt-1 flex gap-2">
        <button
          onClick={() => {
            onAdd(lines(t).map((l) => { const [p, a = ''] = l.split(';;'); return [p.trim(), a.trim()] as [string, string] }))
            setT('')
            setOpen(false)
          }}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: BLUE }}
        >
          Қосу
        </button>
        <button onClick={() => setOpen(false)} className="text-xs" style={{ color: MUTED }}>Болдырмау</button>
      </div>
    </div>
  )
}
