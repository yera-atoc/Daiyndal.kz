import { Suspense } from 'react'
import Portal from '@/components/ielts/Portal'

export const metadata = { title: 'TOEFL iBT mock — Beles education' }

export default function Page() {
  return (
    <Suspense>
      <Portal exam="toefl" />
    </Suspense>
  )
}
