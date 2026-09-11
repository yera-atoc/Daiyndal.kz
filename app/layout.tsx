import type { Metadata } from 'next'
import { PT_Serif, Inter, Caveat } from 'next/font/google'
import './globals.css'

const ptSerif = PT_Serif({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-pt-serif',
  display: 'swap',
})

const inter = Inter({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-inter',
  display: 'swap',
})

const caveat = Caveat({
  subsets: ['cyrillic', 'latin'],
  weight: ['600', '700'],
  variable: '--font-caveat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Beles — НИШ(НЗМ), БІЛ, РФМШ, ЕНТ(ҰБТ) дайындық платформасы',
  description:
    '5-6 сынып оқушыларына арналған көп пәнді дайындық платформасы. НИШ(НЗМ), БІЛ, РФМШ, ЕНТ(ҰБТ) емтихандарына апта сайын — сәрсенбі мен жексенбіде — тесттер.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="kk">
      <body
        className={`${ptSerif.variable} ${inter.variable} ${caveat.variable} font-sans bg-paper text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
