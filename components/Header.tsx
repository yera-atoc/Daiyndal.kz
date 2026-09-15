import Link from 'next/link'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-serif text-xl font-bold text-ink">
          Beles
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-ink/70 sm:flex">
          <a href="/#pans" className="transition hover:text-mustard">
            Пәндер
          </a>
          <a href="/#bagdarlama" className="transition hover:text-mustard">
            НИШ(НЗМ) · БІЛ · РФМШ · ЕНТ(ҰБТ)
          </a>
          <Link href="/tests" className="transition hover:text-mustard">
            Тест банкі
          </Link>
          <Link href="/materials" className="transition hover:text-mustard">
            Материалдар
          </Link>
        </nav>
        <Link
          href="/tests"
          className="rounded-none border border-mustard px-4 py-2 text-sm font-medium text-mustard transition hover:bg-mustard hover:text-board"
        >
          Тесттерді көру
        </Link>
      </div>
    </header>
  )
}
