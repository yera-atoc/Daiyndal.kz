import Link from 'next/link'
import { B } from './brand'

// Кіру беттерінің ортақ қабы: логотип, тақырып, ақ карта
export default function AuthShell({ title, subtitle, children, wide = false }: { title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-10 sm:justify-center" style={{ background: B.paper, color: B.ink }}>
      <Link href="/" aria-label="Басты бет" className="mb-8 rounded-xl bg-white px-3 py-2">
        <img src="/beles-logo.png" alt="Beles education" className="h-10 w-auto" />
      </Link>
      <div className={`w-full ${wide ? 'max-w-md' : 'max-w-sm'} rounded-3xl border bg-white p-6 shadow-sm sm:p-8`} style={{ borderColor: B.line }}>
        <h1 className="font-display text-xl font-semibold sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm leading-relaxed" style={{ color: B.muted }}>{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      <Link href="/" className="mt-6 text-sm hover:underline" style={{ color: B.muted }}>← Басты бетке оралу</Link>
    </main>
  )
}

export const field = 'mt-1.5 w-full rounded-xl border border-[#E3E7F0] bg-[#F5F7FB] px-4 py-3 text-base outline-none transition focus:border-[#2B6BF3] focus:bg-white'
export const primaryBtn = 'w-full rounded-xl bg-[#2B6BF3] py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60'
