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
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 flex flex-col font-sans">
      <Header />

      {/* Hero Section */}
      <section className="bg-white border-b border-zinc-200/80">
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

            <h1 className="text-4xl font-extrabold leading-tight text-zinc-900 sm:text-5xl tracking-tight">
              НИШ(НЗМ), БИЛ, РФМШ және ҰБТ(ЕНТ) емтихандарына дайындал
            </h1>
            <p className="mt-5 max-w-md text-zinc-600 leading-relaxed">
              Апта сайынғы онлайн тесттер мен жаттығулар. Барлық материал қазақ тілінде, нәтижелер бірден шығады.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/tests"
                className="bg-zinc-900 px-6 py-3 text-sm font-semibold text-white rounded-xl transition hover:bg-zinc-800 shadow-sm"
              >
                Тест банкін көру
              </Link>
              <Link
                href="/login"
                className="border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-900 rounded-xl transition hover:border-zinc-900 bg-white"
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

      {/* Оқушылар мен Ата-аналарға арналған ақпарат (БИЛ картасы, күндері & NIS) */}
      <section className="mx-auto max-w-6xl px-6 py-20 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider bg-zinc-200 text-zinc-700 px-3 py-1 rounded-full">
            Ата-аналар мен оқушыларға
          </span>
          <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight mt-3">
            БИЛ лицейлері және NIS туралы маңызды ақпарат
          </h2>
          <p className="mt-2 text-zinc-600 text-sm">
            Тіркелу мерзімдері, қажетті құжаттар және емтихан кестелері
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* БИЛ бөлімі & Өңірлер картасы */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-zinc-900">БИЛ (Білім-инновация лицейлері)</h3>
                <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md font-medium">Тіркелу ашық</span>
              </div>
              <p className="text-zinc-600 text-sm leading-relaxed mb-6">
                Қазақстанның барлық өңірлеріндегі БИЛ лицейлерінің байланыстары, орналасқан мекенжайлары және қабылдау емтихандарының мерзімдері.
              </p>
              
              <div className="space-y-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-100 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-200/60">
                  <span className="font-semibold text-zinc-700">Тіркелу мерзімі:</span>
                  <span className="text-zinc-900 font-medium">01.02 — 26.04</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-200/60">
                  <span className="font-semibold text-zinc-700">Емтихан күні:</span>
                  <span className="text-zinc-900 font-medium">17.05</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-semibold text-zinc-700">Астана ерлер БИЛ (ІВ):</span>
                  <span className="text-zinc-900">+7 7172 53 88 54</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>📍 Барлық өңірлер қамтылған</span>
              <span className="font-semibold text-zinc-900">БИЛ картасы қолжетімді</span>
            </div>
          </div>

          {/* NIS (Назарбаев Зияткерлік мектептері) бөлімі */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-zinc-900">NIS (Назарбаев Зияткерлік мектебі)</h3>
                <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md font-medium">Дайындық материалдары</span>
              </div>
              <p className="text-zinc-600 text-sm leading-relaxed mb-6">
                NIS-ке түсу үшін қажетті құжаттар тізімі, тілдік тесттер және математикалық логикадан дайындық тапсырмалары.
              </p>

              <div className="space-y-2 text-xs text-zinc-700">
                <div className="flex items-center gap-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                  <span className="w-2 h-2 rounded-full bg-zinc-900"></span>
                  <span><strong>Құжаттар тізімі:</strong> ЖСН, анықтама, фотосурет және өтініш.</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                  <span className="w-2 h-2 rounded-full bg-zinc-900"></span>
                  <span><strong>Тілдік тесттер:</strong> Қазақ/Орыс тілінен мәтінмен жұмыс.</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                  <span className="w-2 h-2 rounded-full bg-zinc-900"></span>
                  <span><strong>Математика тесттері:</strong> Логикалық және сандық есептер.</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>📚 Толық нұсқаулық</span>
              <span className="font-semibold text-zinc-900">nis.edu.kz негізінде</span>
            </div>
          </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section id="pans" className="mx-auto max-w-6xl px-6 py-10 w-full">
        <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
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
      <section id="bagdarlama" className="bg-white border-y border-zinc-200/80 my-10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
            Дайындық бағытын таңдаңыз
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {programs.map((program) => (
              <div
                key={program.name}
                className="border border-zinc-200 bg-zinc-50/50 p-6 rounded-2xl shadow-sm transition hover:border-zinc-900 flex flex-col justify-between"
              >
                <div>
                  {program.featured && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-white px-2 py-0.5 rounded">
                      Танымал
                    </span>
                  )}
                  <p className="mt-3 text-2xl font-extrabold text-zinc-900">
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
                <p className="mt-6 text-xs font-medium text-zinc-400 border-t border-zinc-200/60 pt-3">
                  Бағасы: сұраныс бойынша
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#F8F9FA]">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
            Дайындықты бүгіннен бастаңыз
          </h2>
          <p className="mt-3 text-zinc-600">
            Жүйеге кіріп, апталық тесттерге қатысыңыз.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/login"
              className="bg-zinc-900 px-8 py-3.5 text-sm font-semibold text-white rounded-xl transition hover:bg-zinc-800 shadow-sm"
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
