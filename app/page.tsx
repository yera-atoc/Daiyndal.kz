import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import HeroSchedule from '@/components/HeroSchedule'
import SubjectCard from '@/components/SubjectCard'
import { subjects } from '@/lib/subjects'

const programs = [
  {
    name: 'НИШ (НЗМ)',
    tagline: 'Назарбаев Зияткерлік мектептеріне толық дайындық',
    subjectList: ['Математика', 'Ағылшын тілі', 'Жаратылыстану'],
    rotate: '-rotate-1',
    accent: 'border-mustard',
    featured: true,
  },
  {
    name: 'БІЛ',
    tagline: 'Білім-инновация лицейіне түсу емтиханына дайындық',
    subjectList: ['Математика', 'Ағылшын тілі', 'Қазақ тілі'],
    rotate: 'rotate-1',
    accent: 'border-sky',
    featured: false,
  },
  {
    name: 'РФМШ',
    tagline: 'Республикалық физика-математика мектебіне дайындық',
    subjectList: ['Математика', 'Орыс тілі'],
    rotate: '-rotate-1',
    accent: 'border-coral',
    featured: false,
  },
  {
    name: 'ЕНТ (ҰБТ)',
    tagline: 'Ұлттық бірыңғай тестілеуге дайындық',
    subjectList: ['Математика', 'Тарих', 'Таңдау пәндері'],
    rotate: 'rotate-1',
    accent: 'border-mustard',
    featured: false,
  },
]

export default function Home() {
  return (
    <>
      <Header />

      <section className="bg-chalk bg-board">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:py-28 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-mustard">
              5-6 сынып оқушыларына арналған
            </p>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-paper sm:text-5xl">
              НИШ(НЗМ), БІЛ, РФМШ, ЕНТ(ҰБТ) емтихандарына дайындал
            </h1>
            <p className="mt-5 max-w-md text-paper/75">
              Алты пән бойынша апта сайынғы тесттер. Барлық материал қазақ
              тілінде, нәтижелер бірден көрінеді.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/tests"
                className="bg-mustard px-6 py-3 text-sm font-semibold text-board transition hover:bg-paper"
              >
                Тест банкін көру
              </Link>
              <a
                href="#bagdarlama"
                className="border border-paper/40 px-6 py-3 text-sm font-medium text-paper transition hover:border-paper"
              >
                Бағдарламалар
              </a>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <HeroSchedule />
          </div>
        </div>
      </section>

      <section id="pans" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-3xl font-bold">
          Бір платформада — алты пән
        </h2>
        <p className="mt-2 max-w-xl text-ink/70">
          Әр пән бойынша дайын тесттер мен жаттығулар, оқушының жасына және
          мектеп талабына сай.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      </section>

      <section id="bagdarlama" className="bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-serif text-3xl font-bold">
            НИШ(НЗМ), БІЛ, РФМШ, ЕНТ(ҰБТ) — өз бағытыңызды таңдаңыз
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {programs.map((program) => (
              <div
                key={program.name}
                className={`${program.rotate} border-2 ${program.accent} bg-paper p-6 shadow-sm transition hover:rotate-0`}
              >
                {program.featured && (
                  <span className="text-xs font-semibold uppercase tracking-normal text-mustard">
                    Ұсынылады
                  </span>
                )}
                <p className="mt-2 font-serif text-2xl font-bold">
                  {program.name}
                </p>
                <p className="mt-2 text-sm text-ink/70">{program.tagline}</p>
                <ul className="mt-4 space-y-1 text-sm text-ink/80">
                  {program.subjectList.map((s) => (
                    <li key={s}>— {s}</li>
                  ))}
                </ul>
                <p className="mt-5 text-sm text-ink/50">
                  Бағасы: сұраныс бойынша
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-board">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="font-serif text-3xl font-bold text-paper">
            Дайындықты бүгіннен бастаңыз
          </h2>
          <p className="mt-3 text-paper/70">
            Осы сәрсенбіден бастап апталық тесттерге қатысыңыз.
          </p>
          <Link
            href="/tests"
            className="mt-8 inline-block bg-mustard px-8 py-3 text-sm font-semibold text-board transition hover:bg-paper"
          >
            Тест банкіне өту
          </Link>
        </div>
      </section>

      <Footer />
    </>
  )
}
