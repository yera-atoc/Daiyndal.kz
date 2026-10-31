'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import CertificatePages from '@/components/bilim/Certificate'

function Inner() {
  const exam = useSearchParams().get('exam') ?? ''
  return <CertificatePages url={`/api/bilim-test/awards?exam=${encodeURIComponent(exam)}`} back="/admin/bilim-test" backLabel="Білім тексеру" />
}

export default function Page() {
  return <Suspense fallback={null}><Inner /></Suspense>
}
