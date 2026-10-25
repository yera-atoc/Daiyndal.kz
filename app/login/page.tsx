import Link from 'next/link'
import AuthShell from '@/components/site/AuthShell'
import { B } from '@/components/site/brand'

export const metadata = { title: 'Кабинетке кіру — Beles education' }

const ROLES = [
  { href: '/bilim-test', title: 'Білім тексеру', who: 'Оқушы', text: 'Ай сайынғы сынақ, нәтиже және PDF есеп.', color: B.blue },
  { href: '/ubt', title: 'ҰБТ пробный', who: 'Оқушы', text: '120 тапсырма, 140 балл, нәтиже бірден.', color: B.blue },
  { href: '/ielts', title: 'IELTS mock', who: 'Оқушы', text: 'Listening, Reading, Writing, Speaking.', color: B.red },
  { href: '/toefl', title: 'TOEFL iBT mock', who: 'Оқушы', text: '2026 жылғы жаңа формат.', color: B.ink },
  { href: '/teacher/login', title: 'Мұғалім', who: 'Қызметкер', text: 'Материалдар, тесттер, Writing/Speaking тексеру.', color: B.muted },
  { href: '/admin/login', title: 'Әкімші', who: 'Қызметкер', text: 'Оқушылар, топтар, қатысу және сынақтар.', color: B.muted },
]

export default function LoginHub() {
  return (
    <AuthShell wide title="Кабинетке кіру" subtitle="Қай кабинетке кіретініңізді таңдаңыз. Оқушылар аты-жөнін таңдап, мұғалім берген 4 таңбалы PIN кодпен кіреді.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ROLES.map((r) => (
          <Link key={r.href} href={r.href} className="group flex flex-col rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: B.line }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: r.color }}>{r.who}</span>
            <span className="mt-1 text-lg font-semibold">{r.title}</span>
            <span className="mt-1 flex-1 text-sm" style={{ color: B.muted }}>{r.text}</span>
            <span className="mt-3 text-sm font-semibold" style={{ color: B.blue }}>Кіру →</span>
          </Link>
        ))}
      </div>
    </AuthShell>
  )
}
