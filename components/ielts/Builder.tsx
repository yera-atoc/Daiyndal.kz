'use client'

// Мұғалімнің тест құрастырушысы: Listening (аудио + 4 бөлім), Reading (3 мәтін), Writing (2 тапсырма), Speaking (3 бөлім).
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { emptyContent, sectionsOf, type IeltsContent, type IeltsTest, type QGroup, type QType } from '@/lib/ielts'
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
  return {
    ...c,
    listening: c.listening && { ...c.listening, parts: c.listening.parts.map((p, i) => ({ ...p, groups: lg[i] })) },
    reading: c.reading && { ...c.reading, passages: c.reading.passages.map((p, i) => ({ ...p, groups: rg[i] })) },
  }
}

type Draft = Pick<IeltsTest, 'title' | 'variant' | 'mode' | 'published' | 'content'> & { id?: string }

export default function Builder({ initial, onClose }: { initial: Draft | null; onClose: (saved: boolean) => void }) {
  const [d, setD] = useState<Draft>(() => {
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
      const j = await tcall({ action: 'save-test', test: { ...d, content: renumber(d.content) } })
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <button onClick={() => onClose(false)} className="text-sm font-semibold" style={{ color: BLUE }}>← Тесттер</button>
      <div className="mt-3 grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-[1fr_auto_auto_auto]" style={{ borderColor: LINE }}>
        <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="Тесттің аты, мысалы: Mock 1 · Cambridge 18 Test 2" className={inp + ' text-base font-semibold'} />
        <select value={d.variant} onChange={(e) => setD({ ...d, variant: e.target.value as any })} className={inp}>
          <option value="academic">Academic</option>
          <option value="general">General Training</option>
        </select>
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
              <Card key={pi} title={p.title || `Part ${pi + 1}`}>
                <Groups groups={p.groups} onChange={(g) => set((x) => ((x.listening!.parts[pi].groups = g), x))} />
              </Card>
            ))}
          </>
        )}

        {tab === 'reading' && (
          <>
            <Card>
              <Num label="Уақыт, мин" value={c.reading!.minutes} onChange={(v) => set((x) => ((x.reading!.minutes = v), x))} />
            </Card>
            {c.reading!.passages.map((p, pi) => (
              <Card key={pi} title={`Passage ${pi + 1}`}>
                <input value={p.title} onChange={(e) => set((x) => ((x.reading!.passages[pi].title = e.target.value), x))} placeholder="Мәтіннің тақырыбы" className={inp + ' font-semibold'} />
                <textarea value={p.text} onChange={(e) => set((x) => ((x.reading!.passages[pi].text = e.target.value), x))} placeholder="Мәтін (абзацтарды A, B, C… деп белгілеуге болады)" rows={10} className={inp + ' mt-2 leading-6'} />
                <div className="mt-4"><Groups groups={p.groups} onChange={(g) => set((x) => ((x.reading!.passages[pi].groups = g), x))} /></div>
              </Card>
            ))}
          </>
        )}

        {tab === 'writing' && (
          <>
            <Card><Num label="Уақыт, мин" value={c.writing!.minutes} onChange={(v) => set((x) => ((x.writing!.minutes = v), x))} /></Card>
            {(['task1', 'task2'] as const).map((k) => (
              <Card key={k} title={k === 'task1' ? 'Task 1' : 'Task 2'}>
                <textarea value={c.writing![k].prompt} onChange={(e) => set((x) => ((x.writing![k].prompt = e.target.value), x))} rows={5} placeholder={k === 'task1' ? 'The chart below shows… Summarise the information by selecting and reporting the main features…' : 'Some people believe that… To what extent do you agree or disagree?'} className={inp} />
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_140px]">
                  {k === 'task1' ? <FileField label="Сурет (график, кесте, карта)" accept="image/*" value={c.writing!.task1.image} onChange={(u) => set((x) => ((x.writing!.task1.image = u), x))} /> : <div />}
                  <Num label="Ең аз сөз" value={c.writing![k].minWords} onChange={(v) => set((x) => ((x.writing![k].minWords = v), x))} />
                </div>
              </Card>
            ))}
          </>
        )}

        {tab === 'speaking' && c.speaking!.parts.map((p, pi) => (
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

function Groups({ groups, onChange }: { groups: QGroup[]; onChange: (g: QGroup[]) => void }) {
  const upd = (i: number, g: QGroup) => onChange(groups.map((x, j) => (j === i ? g : x)))
  const add = (type: QType) => onChange([...groups, { type, instructions: TYPES.find((t) => t[0] === type)![2], ...(type === 'matching' ? { options: [] } : {}), items: [{ n: 0, prompt: '', answer: '', ...(type === 'mcq' ? { options: [] } : {}) }] }])
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
            {g.type === 'matching' && (
              <>
                <label className="mt-2 block text-xs font-semibold" style={{ color: MUTED }}>Ортақ тізім — әр жолға біреуі: «A Coastal erosion»</label>
                <textarea defaultValue={(g.options ?? []).join('\n')} onBlur={(e) => upd(gi, { ...g, options: lines(e.target.value) })} rows={4} className={inp + ' mt-1'} />
              </>
            )}
            <div className="mt-3 space-y-2">
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
                    onChange={(e) => upd(gi, { ...g, items: g.items.map((x, j) => (j === ii ? { ...x, answer: e.target.value } : x)) })}
                    placeholder={g.type === 'tfng' ? 'TRUE / FALSE / NOT GIVEN' : g.type === 'ynng' ? 'YES / NO / NOT GIVEN' : g.type === 'gap' ? 'Жауап (нұсқалар: 9am | 9 am)' : 'Әріп: B'}
                    className={inp + ' font-semibold'}
                    style={{ color: '#15803D' }}
                    aria-label={`Answer ${it.n}`}
                  />
                  <button onClick={() => upd(gi, { ...g, items: g.items.filter((_, j) => j !== ii) })} className="text-red-500" aria-label="Өшіру">×</button>
                </div>
              ))}
            </div>
            <button onClick={() => upd(gi, { ...g, items: [...g.items, { n: 0, prompt: '', answer: '', ...(g.type === 'mcq' ? { options: [] } : {}) }] })} className="mt-2 text-sm font-semibold" style={{ color: BLUE }}>+ сұрақ</button>
            {g.type !== 'mcq' && <BulkAdd onAdd={(rows) => upd(gi, { ...g, items: [...g.items.filter((x) => x.prompt || x.answer), ...rows.map(([p, a]) => ({ n: 0, prompt: p, answer: a }))] })} />}
          </div>
        )
      })}
      <div className="flex flex-wrap gap-2">
        <span className="self-center text-xs font-semibold" style={{ color: MUTED }}>Сұрақ тобын қосу:</span>
        {TYPES.map(([t, l]) => (
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
