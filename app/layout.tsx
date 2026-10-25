import type { Metadata } from 'next'
import { Geologica, Inter } from 'next/font/google'
import ChatWidget from '@/components/site/ChatWidget'
import ErrorReporter from '@/components/ErrorReporter'
import './globals.css'

// Негізгі мәтін. cyrillic-ext – қазақ әріптері (Ә Ғ Қ Ң Ө Ұ Ү Һ І) үшін міндетті
const inter = Inter({
  subsets: ['latin', 'cyrillic', 'cyrillic-ext'],
  variable: '--font-inter',
  display: 'swap',
})

// Тақырыптар: геометриялық, логотипке үндес және қазақ әріптерінің бәрі бар
const display = Geologica({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], variable: '--font-display', display: 'swap' })

export const metadata: Metadata = {
  title: 'Beles education — НЗМ, БИЛ, РФМШ, ҰБТ, IELTS дайындық орталығы',
  description:
    'Жезқазғандағы Beles education оқу орталығы: НЗМ, БИЛ, РФМШ, ҰБТ, IELTS және TOEFL емтихандарына дайындық. Ай сайынғы Білім тексеру сынағы, онлайн сынақтар және оқушының жеке кабинеті.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="kk">
      <body
        className={`${inter.variable} ${display.variable} font-sans bg-[#F5F7FB] text-ink antialiased`}
      >
        {children}
        <ChatWidget />
        <ErrorReporter />
      </body>
    </html>
  )
}
