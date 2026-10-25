import type { Metadata } from 'next'
import { PT_Serif, Inter, Caveat, Unbounded } from 'next/font/google'
import WhatsAppButton from '@/components/WhatsAppButton'
import ErrorReporter from '@/components/ErrorReporter'
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

// Beles логотипіне үндес кең шрифт: тақырыптар мен үлкен сандар үшін
const display = Unbounded({ subsets: ['latin', 'cyrillic'], weight: ['500', '600'], variable: '--font-display', display: 'swap' })

const caveat = Caveat({
  subsets: ['cyrillic', 'latin'],
  weight: ['600', '700'],
  variable: '--font-caveat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Beles education — НЗМ, БИЛ, РФМШ, ҰБТ, IELTS дайындық орталығы',
  description:
    'Жезқазғандағы Beles education оқу орталығы: НЗМ, БИЛ, РФМШ, ҰБТ, IELTS және TOEFL емтихандарына дайындық. Ай сайынғы Білім тексеру сынағы, онлайн пробныйлар және оқушының жеке кабинеті.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="kk">
      <body
        className={`${ptSerif.variable} ${inter.variable} ${caveat.variable} ${display.variable} font-sans bg-[#F5F7FB] text-ink antialiased`}
      >
        {children}
        <WhatsAppButton />
        <ErrorReporter />
      </body>
    </html>
  )
}
