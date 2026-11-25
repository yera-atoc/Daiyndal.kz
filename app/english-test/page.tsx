import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { B } from '@/components/site/brand'
import AtocTest from './AtocTest'

export const metadata: Metadata = {
  title: 'Ағылшын тілі тесті A1–A2 (AtoC) — Beles education',
  description: 'AtoC кітаптары бойынша онлайн тест: Vocabulary A1–A2 және Workbook A1, әрқайсысында 30 сұрақ. Нәтиже мен қателер бірден шығады.',
}

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: B.paper, color: B.ink }}>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <AtocTest />
      </main>
      <Footer />
    </div>
  )
}
