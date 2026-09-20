'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Role = 'student' | 'teacher'

export default function LoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role>('student')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function switchRole(next: Role) {
    setRole(next)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const endpoint = role === 'student' ? '/api/student/login' : '/api/teacher/login'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Логин немесе құпия сөз қате')
      return
    }

    router.push(role === 'student' ? '/student' : '/teacher')
    router.refresh()
  }

  return (
    <div className="w-full flex justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-zinc-50 p-8 rounded-2xl border border-zinc-200 shadow-sm">

        {/* Логотип */}
        <div className="flex flex-col items-center">
          <Link href="/" className="flex flex-col items-center group mb-2">
            <span className="text-3xl font-black tracking-tight text-black leading-none group-hover:opacity-80 transition-opacity">
              BELES
            </span>
            <span className="text-xs font-bold tracking-widest text-sky-500 uppercase leading-tight">
              education
            </span>
          </Link>

          <h2 className="mt-4 text-2xl font-extrabold text-black tracking-tight">
            Жүйеге кіру
          </h2>
          <p className="mt-2 text-sm text-zinc-600 text-center">
            Аккаунтыңызға кіріп, оқуды жалғастырыңыз.
          </p>
        </div>

        {/* Табуляция */}
        <div className="grid grid-cols-2 gap-1 bg-zinc-200/60 p-1 rounded-xl text-center text-sm font-semibold">
          <button
            type="button"
            onClick={() => switchRole('student')}
            className={`py-2 rounded-lg transition-colors ${
              role === 'student' ? 'bg-white text-black shadow-sm' : 'text-zinc-600 hover:text-black'
            }`}
          >
            Оқушы
          </button>
          <button
            type="button"
            onClick={() => switchRole('teacher')}
            className={`py-2 rounded-lg transition-colors ${
              role === 'teacher' ? 'bg-white text-black shadow-sm' : 'text-zinc-600 hover:text-black'
            }`}
          >
            Мұғалім
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
              Логин
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              placeholder={role === 'student' ? 'Мысалы: aigul25' : 'Мысалы: ielts1'}
              className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-sm text-black placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
              ҚҰПИЯ СӨЗ
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-sm text-black placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-black text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-all shadow-sm disabled:opacity-60"
          >
            {loading ? 'Тексерілуде...' : 'Кіру'}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500 pt-2">
          Логин мен құпия сөзді әкімші (немесе мұғаліміңіз) береді — өзіңіз тіркеле алмайсыз.
        </p>

      </div>
    </div>
  )
}
