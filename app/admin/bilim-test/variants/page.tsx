'use client'

// Жеке нұсқалар: әр оқушыға сұрақтар мен жауаптардың реті әртүрлі парақ (басып шығаруға) және мұғалімге кілттер
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PrintStyles from '@/components/bilim/PrintStyles'
import { LETTERS, type Exam, type Group, type Student } from '@/lib/bilimTest'
import { examVariant, personalQuestions, toPersonal } from '@/lib/bilimShuffle'

type Resp = { group: Group | null; students: Student[]; exam: Exam | null; error?: string }

function Variants() {
  const sp = useSearchParams()
  const examId = sp.get('exam') ?? ''
  const groupId = sp.get('group') ?? examId.split('_')[0]
  const [data, setData] = useState<Resp | null>(null)
  const [keys, setKeys] = useState(true)
  useEffect(() => {
    fetch(`/api/bilim-test/admin?group=${encodeURIComponent(groupId)}&exam=${encodeURIComponent(examId)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        setData(j)
        if (j.exam) document.title = `Жеке нұсқалар — ${j.group?.name ?? ''} — ${j.exam.title}`
      })
  }, [examId, groupId])

  if (!data) return <p className="p-10 text-center text-slate-400">Жүктелуде…</p>
  if (data.error || !data.exam || data.exam.id !== examId) return <p className="p-10 text-center text-rose-600">{data.error ?? 'Сынақ табылмады'}</p>
  const exam = data.exam
  if (!exam.shuffle) return <p className="p-10 text-center text-slate-500">Бұл сынақта «Әр оқушыға жеке нұсқа» өшірулі.</p>
  const students = data.students

  return (
    <>
      <div className="bt-toolbar sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <a href={`/admin/bilim-test?group=${exam.group_id}&exam=${exam.id}&view=settings`} className="text-sm text-blue-600">← Сынақты басқару</a>
        <span className="text-sm text-slate-500">{students.length} оқушы · {data.group?.name} · {exam.title}</span>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={keys} onChange={(e) => setKeys(e.target.checked)} /> Соңында мұғалімге кілттер</label>
        <button onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">PDF сақтау / басып шығару</button>
      </div>
      <div className="bt-pages space-y-8 py-8">
        {students.map((st) => (
          <section key={st.id} className="bt-flow mx-auto bg-white text-[#111] shadow-xl" style={{ fontSize: '9.6pt', lineHeight: 1.38 }}>
            <div className="flex items-start justify-between">
              <img src="/beles-logo.png" alt="Beles education" style={{ height: '11mm' }} />
              <div className="text-right">
                <div className="text-[8.5pt] font-bold uppercase tracking-[.12em] text-blue-600">Білім тексеру · жеке нұсқа</div>
                <div className="mt-0.5 text-[9pt] text-slate-500">{data.group?.name} · {exam.title}</div>
              </div>
            </div>
            <div className="mt-[3mm] h-[1mm] bg-black" />
            <div className="mt-[3mm] flex items-baseline justify-between gap-4">
              <div className="shrink-0 whitespace-nowrap text-[17pt] font-extrabold leading-tight">{st.full_name}</div>
              <div className="text-[8.5pt] text-slate-500">Әр оқушының нұсқасы әртүрлі. Жауабыңды сайтта осы парақтағы нөмір мен әріп бойынша белгіле.</div>
            </div>
            {exam.subjects.map((s) => {
              const v = examVariant(exam, s.id, st.full_name)!
              const qs = personalQuestions(exam.questions[s.id], v)
              return (
                <div key={s.id} className="mt-[3mm]">
                  {exam.subjects.length > 1 && <div className="mb-[1mm] text-[11pt] font-bold">{s.name}</div>}
                  {qs.map((q, i) => {
                    const long = (q.options ?? []).some((o) => o.length > 18)
                    return (
                      <div key={i} className="bt-block flex gap-[2.5mm] border-b border-slate-200 py-[1.6mm]">
                        <span className="w-[6mm] shrink-0 text-right font-bold">{i + 1}.</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">{q.text || `${i + 1}-сұрақ`}</div>
                          {q.options && (
                            <div className={`mt-[0.6mm] grid gap-x-[4mm] ${long ? 'grid-cols-2' : 'grid-cols-4'}`}>
                              {q.options.map((o, k) => <div key={k}><b className="text-blue-600">{LETTERS[k]})</b> {o}</div>)}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div className="bt-block mt-[3mm] rounded-[2mm] border border-slate-300 p-[2.5mm]">
                    <div className="mb-[1mm] text-[8.5pt] font-bold uppercase tracking-wider text-slate-500">Жауаптарым · {s.name}</div>
                    <div className="grid grid-cols-10 gap-x-[2mm] gap-y-[1mm] text-[9pt]">
                      {Array.from({ length: s.questions }, (_, i) => <div key={i} className="border-b border-slate-300 pb-[0.5mm]"><b>{i + 1}</b> ___</div>)}
                    </div>
                  </div>
                </div>
              )
            })}
          </section>
        ))}

        {keys && (
          <section className="bt-flow mx-auto bg-white text-[#111] shadow-xl" style={{ fontSize: '8.6pt' }}>
            <div className="text-[8.5pt] font-bold uppercase tracking-[.12em] text-blue-600">Мұғалімге · таратпаңыз</div>
            <div className="text-[16pt] font-extrabold">Жеке нұсқалардың кілттері</div>
            <p className="mb-[3mm] text-slate-500">Сайтқа енгізілген жауаптар өзі тексеріледі. Бұл кесте қағазды қолмен тексеру үшін.</p>
            {exam.subjects.flatMap((s) =>
              Array.from({ length: Math.ceil(s.questions / 20) }, (_, part) => {
                const from = part * 20
                const cols = Array.from({ length: Math.min(20, s.questions - from) }, (_, i) => from + i)
                return (
                  <table key={`${s.id}-${part}`} className="mb-[4mm] w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-slate-300 bg-slate-100 px-1 text-left">{s.name} · {from + 1}–{from + cols.length}</th>
                        {cols.map((i) => <th key={i} className="border border-slate-300 bg-slate-100 px-0 text-center font-semibold" style={{ width: '5.4mm' }}>{i + 1}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((st) => {
                        const v = examVariant(exam, s.id, st.full_name)!
                        const k = toPersonal(exam.answer_key[s.id] ?? [], v)
                        return (
                          <tr key={st.id} className="bt-block">
                            <td className="whitespace-nowrap border border-slate-300 px-1">{st.full_name}</td>
                            {cols.map((i) => <td key={i} className="border border-slate-300 text-center font-bold">{k[i] || '·'}</td>)}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              })
            )}
          </section>
        )}
      </div>
    </>
  )
}

export default function Page() {
  return (
    <div id="bt-report" className="min-h-screen bg-slate-200">
      <PrintStyles />
      <Suspense fallback={null}>
        <Variants />
      </Suspense>
    </div>
  )
}
