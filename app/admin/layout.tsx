import { Unbounded } from 'next/font/google'

// Тақырыптар мен үлкен сандар үшін кең шрифт — Beles логотипіндегі жазуға үндес
const display = Unbounded({ subsets: ['latin', 'cyrillic'], weight: ['500', '600'], variable: '--font-display', display: 'swap' })

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={display.variable}>
      <style>{`.font-display{font-family:var(--font-display),var(--font-inter),system-ui,sans-serif}`}</style>
      {children}
    </div>
  )
}
