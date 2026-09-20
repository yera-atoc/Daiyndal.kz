'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Me = { id: string; full_name: string; grade: number | null; username: string | null }

export default function StudentHome() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/student/me')
      .then((res) => (res.ok ? res.json() : null))
      .then(setMe)
      .finally(() => setLoading(false))
  }, [])

  async function handleLogout() {
    await fetch('/api/student/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F9F9FB] text-zinc-800">
        <p className="text-xs font-medium tracking-wide text-zinc-500">Жүктелуде...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-sm font-semibold">Beles · Оқушы кабинеті</span>
          <button
            onClick={handleLogout}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
          >
            Шығу
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {me ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-lg font-bold">Сәлем, {me.full_name}!</p>
            <p className="mt-1 text-sm text-zinc-500">
              {me.grade ? `${me.grade}-сынып · ` : ''}Логин: {me.username}
            </p>
            <p className="mt-4 text-xs text-zinc-400">
              Рейтинг, тесттер және прогресс бөлімдері жақында қосылады.
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Мәліметтер табылмады.</p>
        )}
      </div>
    </main>
  )
}
