'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TeacherLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/teacher/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Қате шықты')
      return
    }

    router.push('/teacher')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-ink/10 bg-white p-8 shadow-sm"
      >
        <p className="font-serif text-2xl font-bold text-ink">
          Beles · Оқытушы кіруі
        </p>
        <p className="mt-2 text-sm text-ink/60">
          Материалдар мен тесттер қосу үшін логин мен құпия сөзіңізді
          енгізіңіз. Оларды әкімші береді.
        </p>

        <label className="mt-6 block text-sm text-ink/70">
          Логин
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            className="mt-2 w-full border border-ink/20 bg-paper px-4 py-2 text-ink outline-none focus:border-mustard"
          />
        </label>

        <label className="mt-4 block text-sm text-ink/70">
          Құпия сөз
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-2 w-full border border-ink/20 bg-paper px-4 py-2 text-ink outline-none focus:border-mustard"
          />
        </label>

        {error && <p className="mt-3 text-sm text-coral">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full bg-mustard py-2.5 text-sm font-semibold text-board transition hover:bg-card disabled:opacity-60"
        >
          {loading ? 'Тексерілуде...' : 'Кіру'}
        </button>
      </form>
    </main>
  )
}
