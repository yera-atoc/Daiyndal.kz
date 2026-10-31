'use client'

// Мадақтама (A4 альбомдық): айдың үздік 3 оқушысы және ең көп өскен оқушы
import { useEffect, useState } from 'react'
import type { Award } from '@/lib/bilimAwards'
import { MONTHS_GEN } from '@/components/bilim/ReportSheet'

export type AwardsData = { exam: { id: string; title: string; month: string; published: boolean }; groupName: string; awards: Award[] }

const INK = '#0E1424'
const BLUE = '#2B6BF3'
const RED = '#E5383B'
const GOLD = ['#C99A2E', '#8A96A8', '#B0703C'] // 1, 2, 3-орын

function today() {
  const d = new Date()
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()} ж.`
}

function CertStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      .cert { width: 297mm; height: 210mm; box-sizing: border-box; overflow: hidden; position: relative; }
      @page { size: A4 landscape; margin: 0; }
      @media print {
        body > :not(#bt-cert) { display: none !important; }
        html, body, #bt-cert { background: #fff !important; }
        .bt-toolbar { display: none !important; }
        .cert-pages { padding: 0 !important; }
        .cert-pages > * + * { margin-top: 0 !important; }
        .cert { break-after: page; box-shadow: none !important; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
      @media screen and (max-width: 1180px) { .cert-pages { zoom: 0.36; } }
      @media screen and (min-width: 600px) and (max-width: 1180px) { .cert-pages { zoom: 0.62; } }
    ` }} />
  )
}

function Sheet({ a, data }: { a: Award; data: AwardsData }) {
  const color = a.kind === 'place' ? GOLD[Math.min(a.place, 3) - 1] : BLUE
  const title = a.kind === 'place' ? `${a.place}-орын` : 'Ең үлкен өсу'
  const reason =
    a.kind === 'place'
      ? `«${data.exam.title}» Білім тексеру сынағында топ ішінде ${a.place}-орын алып, ${a.total} / ${a.max} балл жинағаны үшін`
      : `«${data.exam.title}» Білім тексеру сынағында ${a.prevTitle} айымен салыстырғанда нәтижесін ${a.delta} балға арттырғаны үшін`
  return (
    <section className="cert mx-auto bg-white shadow-xl" style={{ color: INK }}>
      {/* Жиек */}
      <div className="absolute inset-[9mm] rounded-[4mm] border-[0.6mm]" style={{ borderColor: color }} />
      <div className="absolute inset-[11.5mm] rounded-[3mm] border-[0.25mm]" style={{ borderColor: '#D9DEE8' }} />
      {/* Beles жолақтары */}
      <div className="absolute bottom-[11.5mm] left-[11.5mm] top-[11.5mm] flex w-[16mm] items-stretch gap-[1.4mm] overflow-hidden rounded-l-[3mm] pl-[4mm]">
        {[1.2, 0.5, 2, 0.6, 1.2, 0.5, 0.9].map((w, i) => (
          <span key={i} style={{ width: `${w}mm`, background: i === 2 ? BLUE : i === 5 ? RED : INK }} />
        ))}
      </div>

      <div className="absolute inset-y-[20mm] left-[40mm] right-[24mm] flex flex-col">
        <div className="flex items-start justify-between">
          <img src="/beles-logo.png" alt="Beles education" style={{ height: '15mm' }} />
          <div className="text-right text-[10pt] leading-snug" style={{ color: '#687085' }}>
            <div className="font-semibold" style={{ color: INK }}>{data.groupName}</div>
            <div>Жезқазған · {today()}</div>
          </div>
        </div>

        <div className="mt-[10mm] text-[11pt] font-bold uppercase tracking-[.32em]" style={{ color }}>{title}</div>
        <h1 className="mt-[2mm] text-[44pt] font-extrabold leading-none tracking-tight">МАДАҚТАМА</h1>
        <p className="mt-[8mm] text-[13pt]" style={{ color: '#687085' }}>марапатталады</p>
        <div className="mt-[2mm] text-[34pt] font-bold leading-tight">{a.name}</div>
        <div className="mt-[3mm] h-[0.7mm] w-[90mm]" style={{ background: color }} />
        <p className="mt-[6mm] max-w-[200mm] text-[13.5pt] leading-relaxed">{reason}.</p>

        <div className="mt-auto flex items-end justify-between">
          <div className="text-[10.5pt]" style={{ color: '#687085' }}>
            <div className="w-[70mm] border-b pb-[1mm]" style={{ borderColor: INK }} />
            <div className="mt-[1.5mm]">Beles education директоры</div>
          </div>
          <div className="grid h-[30mm] w-[30mm] place-items-center rounded-full border-[0.8mm] text-center" style={{ borderColor: color, color }}>
            <div>
              <div className="text-[20pt] font-extrabold leading-none">{a.kind === 'place' ? a.place : `+${a.delta}`}</div>
              <div className="mt-[1mm] text-[7.5pt] font-bold uppercase tracking-wider">{a.kind === 'place' ? 'орын' : 'балл'}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function CertificatePages({ url, back, backLabel }: { url: string; back: string; backLabel: string }) {
  const [data, setData] = useState<AwardsData | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    fetch(url, { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error)
        setData(j)
        document.title = `Мадақтама — ${j.exam.title}`
      })
      .catch((e) => setErr(e.message))
  }, [url])
  return (
    <div id="bt-cert" className="min-h-screen bg-slate-200">
      <CertStyles />
      <div className="bt-toolbar sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <a href={back} className="text-sm text-blue-600">← {backLabel}</a>
        <button onClick={() => window.print()} disabled={!data?.awards.length} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          PDF сақтау / басып шығару
        </button>
      </div>
      {err && <p className="p-10 text-center text-rose-600">{err}</p>}
      {!data && !err && <p className="p-10 text-center text-slate-400">Жүктелуде…</p>}
      {data && !data.awards.length && <p className="p-10 text-center text-slate-500">Бұл сынақ бойынша мадақтама жоқ.</p>}
      {data && data.awards.length > 0 && (
        <div className="cert-pages space-y-8 py-6">
          {data.awards.map((a) => <Sheet key={a.kind + a.name} a={a} data={data} />)}
        </div>
      )}
    </div>
  )
}
