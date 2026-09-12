import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-card text-ink/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-3">
        <div>
          <p className="font-serif text-lg font-bold text-ink">Beles</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            5-6 сынып оқушыларын НИШ(НЗМ), БІЛ, РФМШ және ЕНТ(ҰБТ)
            емтихандарына дайындайтын көп пәнді платформа.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Пәндер</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>Ағылшын тілі</li>
            <li>Қазақ тілі</li>
            <li>Орыс тілі</li>
            <li>Математика</li>
            <li>Жаратылыстану</li>
            <li>Сандық сауаттылық</li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Байланыс</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>WhatsApp: жақында</li>
            <li>Instagram: @beles.platform</li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 border-t border-ink/10 px-6 py-6 text-center text-xs text-ink/50 sm:flex-row sm:justify-between">
        <span>© 2026 Beles. Барлық құқықтар қорғалған.</span>
        <div className="flex gap-4">
          <Link href="/teacher/login" className="transition hover:text-ink/80">
            Оқытушы кіруі
          </Link>
          <Link href="/admin/login" className="transition hover:text-ink/80">
            Әкімші кіруі
          </Link>
        </div>
      </div>
    </footer>
  )
}
