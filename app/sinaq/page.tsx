import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { B } from '@/components/site/brand'
import { TRIAL_TRACKS } from '@/lib/trialTests'
import TrialTest from './TrialTest'

export const metadata: Metadata = {
  title: 'Тегін сынақ: деңгейді анықтау — Beles education',
  description: 'НЗМ/БИЛ, ҰБТ математика немесе ағылшын тілі бойынша 12 сұрақтық тегін онлайн сынақ. Нәтиже мен ұсыныс бірден шығады.',
}

export default function Page() {
  const tracks = TRIAL_TRACKS.map((t) => ({ id: t.id, title: t.title, who: t.who, minutes: t.minutes, count: t.questions.length }))
  return (
    <div className="flex min-h-screen flex-col" style={{ background: B.paper, color: B.ink }}>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <TrialTest tracks={tracks} />
      </main>
      <Footer />
    </div>
  )
}
