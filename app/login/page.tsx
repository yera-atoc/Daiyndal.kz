import Link from 'next/link'
import { BookOpen, ClipboardCheck, Globe2, GraduationCap, Headphones, ShieldCheck, type LucideIcon } from 'lucide-react'
import AuthShell from '@/components/site/AuthShell'

export const metadata = { title: 'Кабинетке кіру — Beles education' }

type Item = { href: string; title: string; text: string; icon: LucideIcon; tint: string }

const STUDENTS: Item[] = [
  { href: '/bilim-test', title: 'Білім тексеру', text: 'Ай сайынғы сынақ және ата-анаға PDF есеп', icon: ClipboardCheck, tint: '#2B6BF3' },
  { href: '/ubt', title: 'ҰБТ сынағы', text: '140 балдық сынақ, нәтиже бірден шығады', icon: GraduationCap, tint: '#5B4CF0' },
  { href: '/ielts', title: 'IELTS mock', text: 'Төрт бөлім, емтихандағыдай таймермен', icon: Headphones, tint: '#E5383B' },
  { href: '/toefl', title: 'TOEFL iBT mock', text: '2026 жылғы жаңа формат', icon: Globe2, tint: '#0E1424' },
]
const TEACHERS: Item[] = [
  { href: '/teacher/login', title: 'Мұғалім кабинеті', text: 'Материалдар, тесттер, жұмыстарды тексеру', icon: BookOpen, tint: '#0F9D6B' },
  { href: '/admin/login', title: 'Әкімші', text: 'Оқушылар, топтар, төлем және қатысу', icon: ShieldCheck, tint: '#687085' },
]

function Group({ title, items }: { title: string; items: Item[] }) {
  return (
    <section>
      <h2 className="mb-2.5 px-1 text-[13px] font-medium" style={{ color: '#687085' }}>{title}</h2>
      <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_1px_2px_rgba(14,20,36,.04),0_8px_24px_-12px_rgba(14,20,36,.12)] ring-1 ring-[#E3E7F0]/70">
        {items.map((r, i) => (
          <Link key={r.href} href={r.href} className="group relative flex items-center gap-4 px-4 py-4 outline-none transition-colors hover:bg-[#F7F8FB] focus-visible:bg-[#EEF3FE] active:bg-[#EFF1F5]">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] text-white shadow-[inset_0_-1px_0_rgba(0,0,0,.12)]" style={{ background: r.tint }}>
              <r.icon size={21} strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold leading-tight">{r.title}</span>
              <span className="mt-0.5 block text-[13.5px] leading-snug" style={{ color: '#687085' }}>{r.text}</span>
            </span>
            <svg className="shrink-0 transition-transform group-hover:translate-x-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B8BFCC" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
            {i < items.length - 1 && <span className="absolute bottom-0 left-[76px] right-0 h-px bg-[#EDF0F5]" />}
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function LoginHub() {
  return (
    <AuthShell title="Кабинетке кіру" subtitle="Оқушы атын таңдап, мұғалім берген 4 таңбалы PIN кодпен кіреді.">
      <div className="space-y-7">
        <Group title="Оқушыларға" items={STUDENTS} />
        <Group title="Мұғалімдерге" items={TEACHERS} />
      </div>
    </AuthShell>
  )
}
