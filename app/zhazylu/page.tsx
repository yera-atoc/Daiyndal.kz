import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { B } from '@/components/site/brand'
import SignupForm from './SignupForm'

export const metadata: Metadata = {
  title: 'Онлайн жазылу — Beles education, Жезқазған',
  description: 'НЗМ, БИЛ, РФМШ, ҰБТ, IELTS дайындық сабақтарына онлайн жазылу. Өтінім қалдырыңыз — менеджер хабарласып, топ пен кестені ұсынады.',
}

export default function Page({ searchParams }: { searchParams: { d?: string } }) {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: B.paper, color: B.ink }}>
      <Header />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold" style={{ borderColor: B.line, color: B.muted }}>
            <span className="h-2 w-2 rounded-full" style={{ background: B.blue }} /> 1 минут
          </span>
          <h1 className="font-display mt-4 text-[2rem] font-semibold leading-tight sm:text-[2.6rem]">Сабаққа онлайн жазылу</h1>
          <p className="mt-4 max-w-md leading-relaxed" style={{ color: B.muted }}>
            Өтінім қалдырыңыз — менеджер жұмыс уақытында хабарласып, баланың сыныбы мен мақсатына қарай топ, кесте және бағасын айтады.
          </p>
          <ol className="mt-8 space-y-4">
            {[
              ['Өтінім', 'Осы форманы толтырасыз.'],
              ['Қоңырау', 'Менеджер хабарласып, сұрақтарыңызға жауап береді.'],
              ['Деңгейді анықтау', 'Тегін сынақ — баланың күшті және әлсіз тұстары анықталады.'],
              ['Сабақ', 'Лайықты топқа қосыласыз, кабинетке PIN беріледі.'],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold text-white" style={{ background: i % 2 ? B.blue : B.ink }}>{i + 1}</span>
                <span><span className="block font-semibold">{t}</span><span className="text-sm" style={{ color: B.muted }}>{d}</span></span>
              </li>
            ))}
          </ol>
        </div>
        <SignupForm initialDirection={searchParams.d} />
      </main>
      <Footer />
    </div>
  )
}
