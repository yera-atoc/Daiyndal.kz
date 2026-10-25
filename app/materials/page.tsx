'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { subjects } from '@/lib/subjects'
import { B } from '@/components/site/brand'

type Material = {
  id: string
  title: string
  subject: string
  description: string | null
  url: string | null
  created_at: string
  teacher_id: string
  teachers: { name: string } | null
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSubject, setActiveSubject] = useState<string>('barlyk')

  useEffect(() => {
    fetch('/api/materials/public')
      .then((res) => res.json())
      .then((data) => setMaterials(Array.isArray(data) ? data : []))
      .catch(() => setMaterials([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered =
    activeSubject === 'barlyk'
      ? materials
      : materials.filter((m) => m.subject === activeSubject)

  const chip = (on: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-medium transition ${on ? 'border-[#0B0F19] bg-[#0B0F19] text-white' : 'border-[#E3E7F0] bg-white text-[#6B7385] hover:border-[#0B0F19]'}`

  return (
    <div className="flex min-h-screen flex-col" style={{ background: B.paper, color: B.ink }}>
      <Header />

      <section className="border-b bg-white" style={{ borderColor: B.line }}>
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Оқу материалдары</h1>
          <p className="mt-3 max-w-xl" style={{ color: B.muted }}>
            Мұғалімдер қосқан конспектілер мен тапсырмалар. Пәнді таңдап, қажетті материалды ашыңыз.
          </p>
          <a href="/ielts/materials" className="mt-4 inline-block text-sm font-semibold" style={{ color: B.blue }}>IELTS · TOEFL дайындық материалдары →</a>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          <button onClick={() => setActiveSubject('barlyk')} className={`${chip(activeSubject === 'barlyk')} shrink-0`}>Барлығы</button>
          {subjects.map((s) => (
            <button key={s.id} onClick={() => setActiveSubject(s.id)} className={`${chip(activeSubject === s.id)} shrink-0`}>{s.name}</button>
          ))}
        </div>

        {loading && <p className="mt-10" style={{ color: B.muted }}>Жүктелуде...</p>}

        {!loading && filtered.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <div key={m.id} className="flex flex-col justify-between rounded-2xl border bg-white p-5" style={{ borderColor: B.line }}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: B.blue }}>
                    {subjects.find((s) => s.id === m.subject)?.name ?? m.subject}
                  </p>
                  <p className="mt-2 text-lg font-semibold">{m.title}</p>
                  {m.description && <p className="mt-2 text-sm" style={{ color: B.muted }}>{m.description}</p>}
                  <p className="mt-3 text-xs" style={{ color: B.muted }}>Мұғалім: {m.teachers?.name ?? 'Белгісіз'}</p>
                </div>
                {m.url && (
                  <a href={m.url} target="_blank" rel="noreferrer" className="mt-4 rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90" style={{ background: B.blue }}>
                    Ашу
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="mt-10 rounded-2xl border border-dashed bg-white p-10 text-center" style={{ borderColor: B.line, color: B.muted }}>
            Бұл пән бойынша материалдар жақында қосылады.
          </div>
        )}
      </section>

      <Footer />
    </div>
  )
}
