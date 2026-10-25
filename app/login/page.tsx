import Link from 'next/link'
import AuthShell from '@/components/site/AuthShell'
import { B } from '@/components/site/brand'

export const metadata = { title: 'Кабинетке кіру — Beles education' }

type Item = { href: string; title: string; text: string; mark: string; fg: string; bg: string }

const STUDENTS: Item[] = [
  { href: '/bilim-test', title: 'Білім тексеру', text: 'Ай сайынғы сынақ, нәтиже және PDF есеп', mark: 'БТ', fg: B.blue, bg: '#EEF3FE' },
  { href: '/ubt', title: 'ҰБТ пробный', text: '120 тапсырма · 140 балл · нәтиже бірден', mark: 'ҰБТ', fg: B.blue, bg: '#EEF3FE' },
  { href: '/ielts', title: 'IELTS mock', text: 'Listening, Reading, Writing, Speaking', mark: 'IELTS', fg: B.red, bg: '#FDEDEE' },
  { href: '/toefl', title: 'TOEFL iBT mock', text: '2026 жылғы жаңа формат', mark: 'TOEFL', fg: B.ink, bg: '#EDEFF3' },
]
const STAFF: Item[] = [
  { href: '/teacher/login', title: 'Мұғалім', text: 'Материалдар, тесттер, жұмыстарды тексеру', mark: 'М', fg: B.muted, bg: '#F1F3F7' },
  { href: '/admin/login', title: 'Әкімші', text: 'Оқушылар, топтар, қатысу, сынақтар', mark: 'Ә', fg: B.muted, bg: '#F1F3F7' },
]

function Group({ title, items }: { title: string; items: Item[] }) {
  return (
    <section>
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wider" style={{ color: B.muted }}>{title}</h2>
      <div className="mt-2 divide-y overflow-hidden rounded-2xl border" style={{ borderColor: B.line }}>
        {items.map((r) => (
          <Link key={r.href} href={r.href} className="flex items-center gap-4 bg-white px-4 py-3.5 transition hover:bg-slate-50 active:bg-slate-100" style={{ borderColor: B.line }}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[11px] font-bold tracking-tight" style={{ color: r.fg, background: r.bg }}>{r.mark}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{r.title}</span>
              <span className="block text-sm leading-snug" style={{ color: B.muted }}>{r.text}</span>
            </span>
            <span className="text-xl leading-none" style={{ color: '#C2C8D3' }} aria-hidden>›</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function LoginHub() {
  return (
    <AuthShell wide title="Кабинетке кіру" subtitle="Оқушылар аты-жөнін таңдап, мұғалім берген 4 таңбалы PIN кодпен кіреді.">
      <div className="space-y-6">
        <Group title="Оқушыларға" items={STUDENTS} />
        <Group title="Қызметкерлерге" items={STAFF} />
      </div>
    </AuthShell>
  )
}
