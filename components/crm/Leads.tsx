'use client'

// Сайттан түскен өтінімдер: жазылу формасы және тегін сынақ нәтижелері
import { useCallback, useEffect, useState } from 'react'
import { BRAND, Badge, Empty, Kpi, Panel, api, btnLine, selCls, waLink } from './core'

const when = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty', day: 'numeric', month: '2-digit', hour: '2-digit', minute: '2-digit' })

type Lead = {
  id: string
  created_at: string
  source: 'form' | 'trial'
  child_name: string
  grade: string | null
  phone: string
  parent_name: string | null
  direction: string | null
  comment: string | null
  trial: { title: string; correct: number; total: number; level: string; weak?: string[] } | null
  status: 'new' | 'called' | 'enrolled' | 'declined'
  note: string | null
}

const ST: Record<Lead['status'], { label: string; bg: string; fg: string }> = {
  new: { label: 'Жаңа', bg: '#DBEAFE', fg: '#1D4ED8' },
  called: { label: 'Хабарластық', bg: '#FEF3C7', fg: '#B45309' },
  enrolled: { label: 'Жазылды', bg: '#DCFCE7', fg: '#15803D' },
  declined: { label: 'Бас тартты', bg: '#F1F5F9', fg: '#64748B' },
}

export default function Leads({ flash }: { flash: (m: string) => void }) {
  const [list, setList] = useState<Lead[] | null>(null)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState<'all' | Lead['status']>('all')
  const load = useCallback(async () => {
    try {
      const j = await api<{ leads: Lead[] }>('/api/admin/leads', 'GET')
      setList(j.leads)
    } catch (e: any) {
      setErr(e.message)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const patch = async (id: string, body: Partial<Lead>) => {
    try {
      await api('/api/admin/leads', 'PATCH', { id, ...body })
      setList((l) => l?.map((x) => (x.id === id ? { ...x, ...body } : x)) ?? null)
      flash('Сақталды')
    } catch (e: any) {
      flash(e.message)
    }
  }
  const remove = async (id: string) => {
    if (!confirm('Өтінімді өшіру керек пе?')) return
    await api(`/api/admin/leads?id=${id}`, 'DELETE').catch((e) => flash(e.message))
    setList((l) => l?.filter((x) => x.id !== id) ?? null)
  }

  if (err)
    return (
      <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: '#FCA5A5', background: '#FEF2F2', color: '#991B1B' }}>
        {err}. Supabase → SQL Editor ішінде <code>supabase/migrations/20261101_01_site_features.sql</code> файлын іске қосыңыз.
      </div>
    )
  if (!list) return <p style={{ color: BRAND.muted }}>Жүктелуде…</p>

  const shown = list.filter((x) => filter === 'all' || x.status === filter)
  const week = list.filter((x) => Date.now() - new Date(x.created_at).getTime() < 7 * 86400e3).length
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Жаңа өтінім" value={String(list.filter((x) => x.status === 'new').length)} tone={BRAND.blue} />
        <Kpi label="Соңғы 7 күнде" value={String(week)} />
        <Kpi label="Тегін сынақ тапсырғандар" value={String(list.filter((x) => x.source === 'trial').length)} />
        <Kpi label="Жазылды" value={String(list.filter((x) => x.status === 'enrolled').length)} tone="#15803D" />
      </div>
      <Panel
        title="Сайттан түскен өтінімдер"
        note="«Онлайн жазылу» формасы мен «Тегін сынақ» беті. Хабарласқан соң күйін өзгертіңіз."
        action={
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className={selCls}>
            <option value="all">Барлығы ({list.length})</option>
            {(Object.keys(ST) as Lead['status'][]).map((k) => <option key={k} value={k}>{ST[k].label} ({list.filter((x) => x.status === k).length})</option>)}
          </select>
        }
      >
        {shown.length === 0 ? (
          <Empty>Әзірге өтінім жоқ. Сайттағы «Онлайн жазылу» және «Тегін сынақ» беттерінен түседі.</Empty>
        ) : (
          <div className="divide-y" style={{ borderColor: BRAND.line }}>
            {shown.map((x) => {
              const wa = waLink(x.phone, `Сәлеметсіз бе! Beles education орталығынан хабарласып отырмыз. ${x.child_name} бойынша өтініміңізді алдық.`)
              return (
                <div key={x.id} className="grid gap-3 py-4 lg:grid-cols-[1.3fr_1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-[15px]">{x.child_name}</b>
                      {x.grade && <span className="text-sm" style={{ color: BRAND.muted }}>{x.grade}-сынып</span>}
                      <Badge bg={ST[x.status].bg} fg={ST[x.status].fg}>{ST[x.status].label}</Badge>
                      <Badge bg={x.source === 'trial' ? '#EDE9FE' : '#F1F5F9'} fg={x.source === 'trial' ? '#6D28D9' : '#475569'}>{x.source === 'trial' ? 'Тегін сынақ' : 'Жазылу формасы'}</Badge>
                    </div>
                    <div className="mt-1 text-sm" style={{ color: BRAND.muted }}>
                      {when(x.created_at)} · {x.direction ?? 'бағыт көрсетілмеген'}{x.parent_name ? ` · ата-анасы: ${x.parent_name}` : ''}
                    </div>
                    {x.trial && (
                      <div className="mt-2 rounded-lg px-3 py-2 text-sm" style={{ background: BRAND.paper }}>
                        <b>{x.trial.correct} / {x.trial.total}</b> · {x.trial.level}
                        {x.trial.weak && x.trial.weak.length > 0 && <span style={{ color: BRAND.muted }}> · әлсіз: {x.trial.weak.slice(0, 4).join(', ')}</span>}
                      </div>
                    )}
                    {x.comment && <p className="mt-2 text-sm">«{x.comment}»</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <a href={`tel:${x.phone}`} className={btnLine}>{x.phone}</a>
                      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-white" style={{ background: '#16A34A' }}>WhatsApp</a>}
                    </div>
                    <input
                      defaultValue={x.note ?? ''}
                      placeholder="Ескертпе (мысалы: сенбіге сынақ сабақ)"
                      onBlur={(e) => e.target.value !== (x.note ?? '') && patch(x.id, { note: e.target.value })}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#2B6BF3]"
                      style={{ borderColor: BRAND.line }}
                    />
                  </div>
                  <div className="flex items-start gap-2 lg:flex-col lg:items-end">
                    <select value={x.status} onChange={(e) => patch(x.id, { status: e.target.value as Lead['status'] })} className={selCls}>
                      {(Object.keys(ST) as Lead['status'][]).map((k) => <option key={k} value={k}>{ST[k].label}</option>)}
                    </select>
                    <button onClick={() => remove(x.id)} className="text-xs" style={{ color: BRAND.muted }}>Өшіру</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Panel>
    </div>
  )
}
