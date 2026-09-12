'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import TestCard from '@/components/TestCard'
import { subjects } from '@/lib/subjects'
import { tests } from '@/lib/tests'

export default function TestsPage() {
  const [activeSubject, setActiveSubject] = useState<string>('barlyk')

  const filtered =
    activeSubject === 'barlyk'
      ? tests
      : tests.filter((t) => t.subjectId === activeSubject)

  return (
    <>
      <Header />

      <section className="border-b border-ink/10 bg-card">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h1 className="font-serif text-4xl font-bold text-ink">
            Тест банкі
          </h1>
          <p className="mt-3 max-w-xl text-ink/70">
            Барлық пән бойынша дайын тесттер. Пәнді таңдап, тиісті тапсырмаларды
            көріңіз.
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
          {subjects.map((subject) => (
            <button
              key={subject.id}
              onClick={() => setActiveSubject(subject.id)}
              className={`border px-4 py-2 text-sm font-medium transition ${
                activeSubject === subject.id
                  ? 'border-ink bg-ink text-paper'
                  : 'border-ink/20 text-ink/70 hover:border-ink/50'
              }`}
            >
              {subject.name}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((test) => {
            const subject = subjects.find((s) => s.id === test.subjectId)!
            return <TestCard key={test.id} test={test} subject={subject} />
          })}
        </div>

        {filtered.length === 0 && (
          <p className="mt-10 text-center text-ink/50">
            Бұл пән бойынша тесттер жақында қосылады.
          </p>
        )}
      </section>

      <Footer />
    </>
  )
}
