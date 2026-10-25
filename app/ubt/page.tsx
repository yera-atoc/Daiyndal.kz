import { Suspense } from 'react'
import Portal from '@/components/ielts/Portal'

export const metadata = { title: 'ҰБТ сынағы — Beles education' }

export default function Page() {
  return (
    <Suspense>
      <Portal exam="ubt" />
    </Suspense>
  )
}
