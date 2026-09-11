'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Қате шықты')
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-board px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-white/10 bg-board-light p-8"
      >
        <p className="font-serif text-2xl font-bold text-paper">
          Beles · Әкімші кіруі
        </p>
        <p className="mt-2 text-sm text-paper/60">
          Оқытушылар мен оқушылар тізімін басқару және қатысуды белгілеу үшін
          кіріңіз.
        </p>

        <label className="mt-6 block text-sm text-paper/80">
          Құпия сөз
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="mt-2 w-full border border-white/20 bg-board px-4 py-2 text-paper outline-none focus:border-mustard"
          />
        </label>

        {error && <p className="mt-3 text-sm text-coral">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full bg-mustard py-2.5 text-sm font-semibold text-board transition hover:bg-paper disabled:opacity-60"
        >
          {loading ? 'Тексерілуде...' : 'Кіру'}
        </button>
      </form>
    </main>
  )
}
