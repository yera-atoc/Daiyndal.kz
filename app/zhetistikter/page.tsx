import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { B } from '@/components/site/brand'
import Stripes from '@/components/site/Stripes'
import { NIS_GRANT_2026, NIS_GRANT_YEAR, NIS_SUBJECT_MIN } from '@/lib/nisGrant'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Жетістіктер және НЗМ грант шекті балдары — Beles education',
  description: 'Beles education түлектерінің НЗМ, БИЛ, РФМШ, ҰБТ және IELTS нәтижелері. НЗМ-ге грантпен түсу үшін 2026 жылғы шекті балдар — барлық мектептер бойынша.',
}

type Item = { id: string; year: number; student: string; exam: string; result: string; school: string | null }

async function load(): Promise<Item[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('site_achievements')
      .select('id, year, student, exam, result, school')
      .eq('published', true)
      .order('year', { ascending: false })
      .order('position')
    return error ? [] : (data as Item[])
  } catch {
    return []
  }
}

const TONE: Record<string, string> = { НЗМ: B.blue, БИЛ: B.red, РФМШ: B.ink, ҰБТ: '#5B4CF0', IELTS: '#0F9D6B', TOEFL: '#0F9D6B' }

export default async function Page() {
  const items = await load()
  const years = Array.from(new Set(items.map((x) => x.year)))
  const bySchool = [...NIS_GRANT_2026].sort((a, b) => a.name.localeCompare(b.name, 'kk'))
  return (
    <div className="flex min-h-screen flex-col" style={{ background: B.paper, color: B.ink }}>
      <Header />
      <section className="border-b bg-white" style={{ borderColor: B.line }}>
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="font-display max-w-3xl text-[2rem] font-semibold leading-tight sm:text-[3rem]">Оқушыларымыздың жетістіктері</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: B.muted }}>
            НЗМ, БИЛ, РФМШ, ҰБТ және IELTS нәтижелері. Төменде — НЗМ-ге грантпен түсу үшін {NIS_GRANT_YEAR} жылғы шекті балдар.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/sinaq" className="rounded-xl px-6 py-3.5 text-center text-sm font-semibold text-white" style={{ background: B.blue }}>Тегін сынақ тапсыру</Link>
            <Link href="/zhazylu" className="rounded-xl border px-6 py-3.5 text-center text-sm font-semibold" style={{ borderColor: B.line }}>Онлайн жазылу</Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6"><Stripes count={64} height="h-12" /></div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Түлектер</h2>
        {items.length === 0 ? (
          <p className="mt-3 max-w-2xl rounded-2xl border bg-white p-5" style={{ borderColor: B.line, color: B.muted }}>Түлектеріміздің нәтижелері жақында осында жарияланады.</p>
        ) : (
          years.map((y) => (
            <div key={y} className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: B.muted }}>{y}</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.filter((x) => x.year === y).map((x) => (
                  <div key={x.id} className="flex gap-4 rounded-2xl border bg-white p-4" style={{ borderColor: B.line }}>
                    <span className="w-1.5 shrink-0 rounded-full" style={{ background: TONE[x.exam.split(/[\s·]/)[0]] ?? B.blue }} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: TONE[x.exam.split(/[\s·]/)[0]] ?? B.blue }}>{x.exam}</div>
                      <div className="mt-1 text-lg font-semibold leading-tight">{x.student}</div>
                      <div className="mt-1 font-display text-xl font-semibold">{x.result}</div>
                      {x.school && <div className="mt-0.5 text-sm" style={{ color: B.muted }}>{x.school}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <section id="nzm-grant" className="scroll-mt-20 border-t bg-white" style={{ borderColor: B.line }}>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">НЗМ-ге грант: {NIS_GRANT_YEAR} жылғы балдар</h2>
          <p className="mt-3 max-w-3xl leading-relaxed" style={{ color: B.muted }}>
            Грант жалпы балл бойынша ең жоғары нәтиже көрсеткендерге беріледі, бірақ {NIS_SUBJECT_MIN.map((s) => `${s.name.toLowerCase()} бойынша кемінде ${Math.round(s.share * 100)} %`).join(' және ')} жинау міндетті.
            Кестеде әр мектепте грант алғандардың ең жоғары (Max) және ең төменгі (Min) балы, 1500 балдық шкала бойынша. Дереккөз — NIS ресми жарияланымы.
          </p>
          <div className="mt-6 overflow-x-auto rounded-2xl border" style={{ borderColor: B.line }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider" style={{ background: B.paper, color: B.muted }}>
                  <th className="px-4 py-3">Мектеп</th>
                  <th className="px-4 py-3 text-right">Min</th>
                  <th className="px-4 py-3 text-right">Max</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Аралық</th>
                </tr>
              </thead>
              <tbody>
                {bySchool.map((s) => (
                  <tr key={s.name} className="border-t" style={{ borderColor: B.line }}>
                    <td className="px-4 py-2.5 font-medium">НЗМ {s.name}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{s.min}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: B.muted }}>{s.max}</td>
                    <td className="hidden w-[40%] px-4 py-2.5 sm:table-cell">
                      <div className="relative h-2 rounded-full" style={{ background: B.line }}>
                        <div className="absolute inset-y-0 rounded-full" style={{ left: `${((s.min - 850) / 650) * 100}%`, right: `${100 - ((s.max - 850) / 650) * 100}%`, background: B.blue }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm" style={{ color: B.muted }}>
            Біздің ай сайынғы Білім тексеру сынағы да 1500 балдық шкаламен өтеді — оқушы өз нәтижесін осы шекті балдармен кабинетінде салыстырып отырады.
          </p>
        </div>
      </section>
      <Footer />
    </div>
  )
}
