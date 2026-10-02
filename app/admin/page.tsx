'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Student = {
  id: string
  full_name: string
  grade: number | null
  payment_deadline?: string | null
  payment_amount?: number | null
  phone?: string | null
  comment?: string | null
}

export default function AdminDashboard() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Жаңа оқушы қосуға арналған қысқаша форма күйі
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDeadline, setPaymentDeadline] = useState('')

  async function loadStudents() {
    const res = await fetch('/api/students')
    if (res.ok) setStudents(await res.json())
  }

  useEffect(() => {
    setLoading(true)
    loadStudents().finally(() => setLoading(false))
  }, [])

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  // 1 кликпен төлемді 1 айға ұзарту (Автоматты түрде)
  async function quickPay(studentId: string, currentAmount: number | null) {
    const today = new Date().toISOString().split('T')[0]
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const deadline = nextMonth.toISOString().split('T')[0]

    await fetch(`/api/students/${studentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_date: today,
        payment_deadline: deadline,
      }),
    })

    // Payments тарихына да жазып қою
    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        amount: currentAmount || 0,
        paid_on: today,
        period_end: deadline,
        note: 'Админ панельден жылдам қабылданды',
      }),
    }).catch(() => {}) // Егер payments кестесі әлі дайын болмаса қате бермеуі үшін

    loadStudents()
  }

  async function addStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return

    await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        phone: phone || null,
        paymentAmount: paymentAmount ? Number(paymentAmount) : null,
        paymentDeadline: paymentDeadline || null,
      }),
    })

    setFullName('')
    setPhone('')
    setPaymentAmount('')
    setPaymentDeadline('')
    loadStudents()
  }

  async function removeStudent(id: string) {
    if (!confirm('Бұл оқушыны шынымен өшіргіңіз келе ме?')) return
    await fetch(`/api/students/${id}`, { method: 'DELETE' })
    loadStudents()
  }

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500 text-xs">
        Жүктелуде...
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 p-6 max-w-4xl mx-auto">
      {/* Шағын таза шапка */}
      <header className="flex items-center justify-between bg-white border border-zinc-200 rounded-2xl p-4 mb-6 shadow-sm">
        <h1 className="text-sm font-bold">🎯 Daiyndal.kz — Жеңілдетілген Админка</h1>
        <button
          onClick={handleLogout}
          className="border border-zinc-200 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
        >
          Шығу
        </button>
      </header>

      {/* Жылдам оқушы қосу формасы */}
      <form onSubmit={addStudent} className="bg-white border border-zinc-200 rounded-2xl p-5 mb-6 shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-zinc-700 uppercase">➕ Жылдам оқушы қосу</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Аты-жөні"
            className="border border-zinc-200 bg-zinc-50 rounded-xl px-3 py-2 text-xs"
            required
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Телефон (WhatsApp)"
            className="border border-zinc-200 bg-zinc-50 rounded-xl px-3 py-2 text-xs"
          />
          <input
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="Сомасы (₸)"
            className="border border-zinc-200 bg-zinc-50 rounded-xl px-3 py-2 text-xs"
          />
          <input
            type="date"
            value={paymentDeadline}
            onChange={(e) => setPaymentDeadline(e.target.value)}
            className="border border-zinc-200 bg-zinc-50 rounded-xl px-3 py-2 text-xs"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-zinc-900 text-white rounded-xl py-2 text-xs font-medium hover:bg-zinc-800 transition"
        >
          Оқушыны қосу
        </button>
      </form>

      {/* Іздеу жолағы */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Оқушыны аты бойынша іздеу..."
          className="w-full border border-zinc-200 bg-white rounded-2xl px-4 py-2.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
      </div>

      {/* Оқушылар тізімі (Клик-клик жүйесі) */}
      <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100 shadow-sm overflow-hidden">
        {filteredStudents.map((s) => (
          <div key={s.id} className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/50 transition">
            <div>
              <p className="text-xs font-bold text-zinc-900">{s.full_name}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                📞 {s.phone || 'Телефон жоқ'} · 💳 Дедлайн: <span className="text-amber-600 font-semibold">{s.payment_deadline || 'Көрсетілмеген'}</span> {s.payment_amount ? `· ₸ ${s.payment_amount}` : ''}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* WhatsApp-қа бір шертумен өту */}
              {s.phone && (
                <a
                  href={`https://wa.me/${s.phone.replace(/\D/g, '')}?text=Сәлеметсіз бе! Айлық төлем уақыты жақындады.`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-emerald-100 transition"
                >
                  WhatsApp
                </a>
              )}

              {/* 1 кликпен төлемді ұзарту */}
              <button
                onClick={() => quickPay(s.id, s.payment_amount ?? null)}
                className="bg-zinc-900 text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-zinc-800 transition"
              >
                ✅ Төледі (+1 ай)
              </button>

              {/* Өшіру */}
              <button
                onClick={() => removeStudent(s.id)}
                className="text-zinc-400 hover:text-red-600 px-2 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {filteredStudents.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-400">
            Оқушылар табылмады.
          </div>
        )}
      </div>
    </main>
  )
}
