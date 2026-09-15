'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { subjects } from '@/lib/subjects'

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
      .finally(() => setLoading(false))
  }, [])

  const filtered =
    activeSubject === 'barlyk'
      ? materials
      : materials.filter((m) => m.subject === activeSubject)

  return (
    <>
      <Header />

      <section className="border-b border-ink/10 bg-card">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h1 className="font-serif text-4xl font-bold text-ink">Материалдар</h1>
          <p className="mt-3 max-w-xl text-ink/70">
            Мұғалімдер қосқан оқу материалдары. Пәнді таңдап, қажетті материалды
            ашыңыз.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSubject('barlyk')}
            className={`border px-4 py-2 text-sm font-medium transition ${
              activeSubject === 'barlyk'
                ? 'border-ink bg-ink text-paper'
                : 'border-ink/20 text-ink/70 hover:border-ink/50'
            }`}
          >
            Барлығы
          </button>
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSubject(s.id)}
              className={`border px-4 py-2 text-sm font-medium transition ${
                activeSubject === s.id
                  ? 'border-ink bg-ink text-paper'
                  : 'border-ink/20 text-ink/70 hover:border-ink/50'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {loading && <p className="mt-10 text-ink/50">Жүктелуде...</p>}

        {!loading && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="flex flex-col justify-between border border-ink/10 bg-card p-5"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-normal text-ink/50">
                    {subjects.find((s) => s.id === m.subject)?.name ?? m.subject}
                  </p>
                  <p className="mt-2 font-serif text-lg font-bold text-ink">
                    {m.title}
                  </p>
                  {m.description && (
                    <p className="mt-2 text-sm text-ink/70">{m.description}</p>
                  )}
                  <p className="mt-3 text-xs text-ink/50">
                    Мұғалім: {m.teachers?.name ?? 'Белгісіз'}
                  </p>
                </div>
                {m.url && (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block border border-mustard px-4 py-2 text-center text-sm font-medium text-mustard transition hover:bg-mustard hover:text-board"
                  >
                    Ашу
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="mt-10 text-center text-ink/50">
            Бұл пән бойынша материалдар жақында қосылады.
          </p>
        )}
      </section>

      <Footer />
    </>
  )
}
