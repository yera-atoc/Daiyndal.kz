'use client'

// «Жетістіктер» беті: түлектердің нәтижелерін әкімші қосады (ата-ана рұқсатымен, аты қысқа: «Әлихан Б.»)
import { useCallback, useEffect, useState } from 'react'
import { BRAND, Empty, Panel, api, btnDark, btnLine, inputCls } from './core'

type Item = { id: string; year: number; student: string; exam: string; result: string; school: string | null; published: boolean; position: number }
const EXAMS = ['НЗМ', 'БИЛ', 'РФМШ', 'ҰБТ', 'IELTS', 'TOEFL', 'Олимпиада']
const blank = () => ({ id: '', year: new Date().getFullYear(), student: '', exam: 'НЗМ', result: '', school: '', published: true, position: 0 })

export default function Achievements({ flash }: { flash: (m: string) => void }) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [err, setErr] = useState('')
  const [f, setF] = useState(blank())
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    try {
      setItems((await api<{ items: Item[] }>('/api/admin/achievements', 'GET')).items)
    } catch (e: any) {
      setErr(e.message)
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api('/api/admin/achievements', 'POST', f)
      flash(f.id ? 'Өзгертілді' : 'Қосылды')
      setF(blank())
      load()
    } catch (e: any) {
      flash(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (err)
    return (
      <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: '#FCA5A5', background: '#FEF2F2', color: '#991B1B' }}>
        {err}. Supabase → SQL Editor ішінде <code>supabase/migrations/20261101_01_site_features.sql</code> файлын іске қосыңыз.
      </div>
    )

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <Panel title={f.id ? 'Нәтижені өзгерту' : 'Жаңа нәтиже'} note="Сайттағы «Жетістіктер» бетінде шығады. Атын ата-ана рұқсатымен, қысқа жазыңыз.">
        <form onSubmit={save} className="space-y-3">
          <label className="block text-sm">Оқушы<input required value={f.student} onChange={(e) => setF({ ...f, student: e.target.value })} placeholder="Әлихан Б." className={`${inputCls} mt-1`} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">Емтихан
              <input list="ach-exams" required value={f.exam} onChange={(e) => setF({ ...f, exam: e.target.value })} className={`${inputCls} mt-1`} />
              <datalist id="ach-exams">{EXAMS.map((x) => <option key={x} value={x} />)}</datalist>
            </label>
            <label className="block text-sm">Жыл<input type="number" required value={f.year} onChange={(e) => setF({ ...f, year: Number(e.target.value) })} className={`${inputCls} mt-1`} /></label>
          </div>
          <label className="block text-sm">Нәтиже<input required value={f.result} onChange={(e) => setF({ ...f, result: e.target.value })} placeholder="1420 балл, грант" className={`${inputCls} mt-1`} /></label>
          <label className="block text-sm">Мектеп / ЖОО<input value={f.school ?? ''} onChange={(e) => setF({ ...f, school: e.target.value })} placeholder="НЗМ Қарағанды" className={`${inputCls} mt-1`} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} /> Сайтта көрсету</label>
          <div className="flex gap-2">
            <button disabled={saving} className={btnDark} style={{ background: BRAND.ink }}>{f.id ? 'Сақтау' : 'Қосу'}</button>
            {f.id && <button type="button" onClick={() => setF(blank())} className={btnLine}>Болдырмау</button>}
          </div>
        </form>
      </Panel>
      <Panel title="Жарияланған нәтижелер" note="Бетті ашу: /zhetistikter" action={<a href="/zhetistikter" target="_blank" className={btnLine}>Сайтта ашу ↗</a>}>
        {!items ? <p style={{ color: BRAND.muted }}>Жүктелуде…</p> : items.length === 0 ? <Empty>Әзірге нәтиже қосылмаған.</Empty> : (
          <div className="divide-y" style={{ borderColor: BRAND.line }}>
            {items.map((x) => (
              <div key={x.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="w-12 tabular-nums" style={{ color: BRAND.muted }}>{x.year}</span>
                <span className="w-16 font-semibold">{x.exam}</span>
                <span className="min-w-0 flex-1"><b>{x.student}</b> — {x.result}{x.school ? ` · ${x.school}` : ''}{!x.published && <span style={{ color: BRAND.muted }}> · жасырын</span>}</span>
                <button onClick={() => setF({ ...x, school: x.school ?? '' })} className="text-xs font-semibold" style={{ color: BRAND.blue }}>Өзгерту</button>
                <button onClick={async () => { if (!confirm('Өшіру керек пе?')) return; await api(`/api/admin/achievements?id=${x.id}`, 'DELETE').catch((e) => flash(e.message)); load() }} className="text-xs" style={{ color: BRAND.muted }}>Өшіру</button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
