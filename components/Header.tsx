'use client'

import Link from 'next/link'
import { useState } from 'react'
import { B } from './site/brand'

const NAV: [string, string][] = [
  ['Бағдарламалар', '/#programs'],
  ['Мұғалімдер', '/#teachers'],
  ['Платформа', '/#platform'],
  ['Материалдар', '/materials'],
  ['Байланыс', '/#contact'],
]

export default function Header() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur" style={{ borderColor: B.line }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Beles education — басты бет" className="shrink-0">
          <img src="/beles-logo.png" alt="Beles education" className="h-9 w-auto" />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium md:flex" style={{ color: B.muted }}>
          {NAV.map(([label, href]) => (
            <Link key={href} href={href} className="transition hover:text-black">{label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" style={{ background: B.ink }}>
            Кабинетке кіру
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Мәзір"
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-lg border md:hidden"
            style={{ borderColor: B.line }}
          >
            <span className="relative block h-3 w-4">
              <span className={`absolute left-0 h-0.5 w-4 bg-black transition ${open ? 'top-1.5 rotate-45' : 'top-0'}`} />
              <span className={`absolute left-0 top-1.5 h-0.5 w-4 bg-black transition ${open ? 'opacity-0' : ''}`} />
              <span className={`absolute left-0 h-0.5 w-4 bg-black transition ${open ? 'top-1.5 -rotate-45' : 'top-3'}`} />
            </span>
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t px-4 pb-4 pt-2 md:hidden" style={{ borderColor: B.line }}>
          {NAV.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-base font-medium hover:bg-slate-50">
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
