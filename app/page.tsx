import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HeroSchedule from '@/components/HeroSchedule'
import SubjectCard from '@/components/SubjectCard'
import { subjects } from '@/lib/subjects'

const programs = [
  {
    name: 'НИШ (НЗМ)',
    tagline: '5-6 сынып оқушыларына арналған дайындық',
    subjectList: ['Математика', 'Ағылшын тілі', 'Жаратылыстану'],
    featured: true,
  },
  {
    name: 'БИЛ',
    tagline: '5-6 сынып оқушыларына арналған дайындық',
    subjectList: ['Математика', 'Ағылшын тілі', 'Қазақ тілі'],
    featured: false,
  },
  {
    name: 'РФМШ',
    tagline: '5-6 сынып оқушыларына арналған дайындық',
    subjectList: ['Математика', 'Орыс тілі'],
    featured: false,
  },
  {
    name: 'ЕНТ (ҰБТ)',
    tagline: '9, 10, 11 сынып оқушыларына арналған дайындық',
    subjectList: ['Математика', 'Тарих', 'Таңдау пәндері'],
    featured: true,
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans">
      <Header />

      {/* Hero Section */}
      <section className="bg-white border-b border-zinc-100">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-24 lg:grid-cols-2">
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-block px-3 py-1 bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold rounded-full">
                5-6 сынып: НИШ, БИЛ, РФМШ
              </span>
              <span className="inline-block px-3 py-1 bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold rounded-full">
                9-11 сынып: ҰБТ (ЕНТ)
              </span>
            </div>

            <h1 className="text-4xl font-extrabold leading-tight text-black sm:text-5xl tracking-tight">
              НИШ(НЗМ), БИЛ, РФМШ және ҰБТ(ЕНТ) емтихандарына дайындал
            </h1>
            <p className="mt-5 max-w-md text-zinc-600 leading-relaxed">
              Апта сайынғы онлайн тесттер мен жаттығулар. Барлық материал қазақ тілінде, нәтижелер бірден шығады.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/tests"
                className="bg-black px-6 py-3 text-sm font-semibold text-white rounded-lg transition hover:bg-zinc-800 shadow-sm"
              >
                Тест банкін көру
              </Link>
              <Link
                href="/login"
                className="border border-zinc-300 px-6 py-3 text-sm font-semibold text-black rounded-lg transition hover:border-black bg-white"
              >
                Жүйеге кіру
              </Link>
            </div>
          </div>
          <div className="flex justify-center border border-zinc-200 bg-zinc-50 rounded-2xl p-6 lg:justify-end shadow-sm">
            <HeroSchedule />
          </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section id="pans" className="mx-auto max-w-6xl px-6 py-20 w-full">
        <h2 className="text-3xl font-extrabold text-black tracking-tight">
          Бір платформада — барлық пәндер
        </h2>
        <p className="mt-2 max-w-xl text-zinc-600">
          Әр пән бойынша дайын тесттер мен жаттығулар, оқушының жасына және мектеп талабына сай.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      </section>

      {/* Programs Section */}
      <section id="bagdarlama" className="bg-zinc-50 border-y border-zinc-200">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-extrabold text-black tracking-tight">
            Дайындық бағытын таңдаңыз
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {programs.map((program) => (
              <div
                key={program.name}
                className="border border-zinc-200 bg-white p-6 rounded-xl shadow-sm transition hover:border-black flex flex-col justify-between"
              >
                <div>
                  {program.featured && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded">
                      Танымал
                    </span>
                  )}
                  <p className="mt-3 text-2xl font-extrabold text-black">
                    {program.name}
                  </p>
                  <p className="mt-2 text-xs font-medium text-zinc-500 leading-snug">{program.tagline}</p>
                  <ul className="mt-4 space-y-1 text-sm text-zinc-700">
                    {program.subjectList.map((s) => (
                      <li key={s} className="flex items-center gap-1.5">
                        <span className="text-zinc-400">—</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-6 text-xs font-medium text-zinc-400 border-t border-zinc-100 pt-3">
                  Бағасы: сұраныс бойынша
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl font-extrabold text-black tracking-tight">
            Дайындықты бүгіннен бастаңыз
          </h2>
          <p className="mt-3 text-zinc-600">
            Жүйеге кіріп, апталық тесттерге қатысыңыз.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="bg-black px-8 py-3.5 text-sm font-semibold text-white rounded-lg transition hover:bg-zinc-800 shadow-sm"
            >
              Жеке кабинетке кіру
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
