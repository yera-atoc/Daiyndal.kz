import Link from 'next/link'
import Stripes from './Stripes'

const INK = '#0E1424'
const MUTED = '#687085'

// Кіру беттерінің ортақ қабы.
// Компьютерде: сол жақта қараңғы фирмалық панель (Beles жолақтары), оң жақта форма.
// Телефонда: логотип, жолақ белдеуі, форма.
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(420px,5fr)_7fr]" style={{ background: '#F5F7FB', color: INK }}>
      {/* Фирмалық панель */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between" style={{ background: INK }}>
        <div className="p-10">
          <Link href="/" aria-label="Басты бет" className="inline-flex rounded-xl bg-white px-3 py-2">
            <img src="/beles-logo.png" alt="Beles education" className="h-8 w-auto" />
          </Link>
        </div>
        <div className="px-10">
          <p className="font-display max-w-sm text-[2.6rem] font-semibold leading-[1.08] text-white">Біліміңді өлше, өсуіңді көр</p>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/60">Beles education оқушылары, ата-аналары мен мұғалімдеріне арналған платформа. Жезқазған.</p>
        </div>
        <div className="px-10 pt-10">
          <Stripes count={46} height="h-56" light />
        </div>
      </aside>

      {/* Форма */}
      <main className="flex min-h-screen flex-col px-5 pb-10 pt-6 sm:px-8 lg:items-center lg:justify-center lg:py-12">
        <div className="w-full max-w-[440px] lg:mx-auto">
          <div className="flex items-center justify-between lg:hidden">
            <Link href="/" aria-label="Басты бет"><img src="/beles-logo.png" alt="Beles education" className="h-8 w-auto mix-blend-multiply" /></Link>
          </div>
          <Stripes count={34} height="h-10" className="mt-6 lg:hidden" />

          <h1 className="font-display mt-8 text-[1.9rem] font-semibold leading-tight tracking-[-0.01em] lg:mt-0 lg:text-[2.2rem]">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] leading-relaxed" style={{ color: MUTED }}>{subtitle}</p>}
          <div className="mt-8">{children}</div>

          <Link href="/" className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium transition hover:text-[#0E1424]" style={{ color: MUTED }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 18-6-6 6-6" /></svg>
            Басты бет
          </Link>
        </div>
      </main>
    </div>
  )
}

export const field = 'mt-2 w-full rounded-2xl border border-[#E3E7F0] bg-white px-4 py-3.5 text-base outline-none transition focus:border-[#2B6BF3] focus:ring-4 focus:ring-[#2B6BF3]/10'
export const primaryBtn = 'w-full rounded-2xl bg-[#0E1424] py-3.5 text-[15px] font-semibold text-white transition hover:bg-[#1c2438] active:scale-[.99] disabled:opacity-60'
