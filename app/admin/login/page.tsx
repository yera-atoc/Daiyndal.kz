'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthShell, { field, primaryBtn } from '@/components/site/AuthShell'

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
    <AuthShell title="Әкімші кабинеті" subtitle="Оқушылар, топтар, қатысу және Білім тексеру сынақтарын басқару.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          Құпия сөз
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password" className={field} />
        </label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[#E5383B]">{error}</p>}
        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? 'Тексерілуде...' : 'Кіру'}
        </button>
      </form>
    </AuthShell>
  )
}
