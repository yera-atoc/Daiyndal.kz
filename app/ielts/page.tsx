import { Suspense } from 'react'
import Portal from '@/components/ielts/Portal'

export const metadata = { title: 'IELTS mock — Beles education' }

export default function Page() {
  return (
    <Suspense>
      <Portal exam="ielts" />
    </Suspense>
  )
}
