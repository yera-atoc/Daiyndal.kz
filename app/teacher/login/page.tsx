'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthShell, { field, primaryBtn } from '@/components/site/AuthShell'

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

    // ?next=/ielts/teacher — тек сайттың ішкі беттеріне
    const next = new URLSearchParams(window.location.search).get('next') ?? ''
    router.push(/^\/[a-z]/i.test(next) && !next.startsWith('//') ? next : '/teacher')
    router.refresh()
  }

  return (
    <AuthShell title="Мұғалім кабинеті" subtitle="Логин мен құпия сөзді орталық әкімшісі береді.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          Логин
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" className={field} />
        </label>
        <label className="block text-sm font-medium">
          Құпия сөз
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={field} />
        </label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[#E5383B]">{error}</p>}
        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? 'Тексерілуде...' : 'Кіру'}
        </button>
      </form>
    </AuthShell>
  )
}
