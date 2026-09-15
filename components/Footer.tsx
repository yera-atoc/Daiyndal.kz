import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 text-zinc-600 text-sm">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Бренд ақпараты */}
          <div>
            <h3 className="font-bold text-black text-lg mb-2">BELES EDUCATION</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              НИШ (НЗМ), БИЛ, РФМШ және ҰБТ (ЕНТ) емтихандарына сапалы дайындық платформасы.
            </p>
          </div>

          {/* Бағыттар */}
          <div>
            <h4 className="font-semibold text-black mb-3 text-xs uppercase tracking-wider">Навигация</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/#pans" className="hover:text-black transition">Пәндер</Link></li>
              <li><Link href="/#bagdarlama" className="hover:text-black transition">Бағдарламалар</Link></li>
              <li><Link href="/tests" className="hover:text-black transition">Тест банкі</Link></li>
              <li><Link href="/materials" className="hover:text-black transition">Материалдар</Link></li>
            </ul>
          </div>

          {/* Байланыс / Контактілер */}
          <div>
            <h4 className="font-semibold text-black mb-3 text-xs uppercase tracking-wider">Байланыс</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-zinc-400 block">WhatsApp:</span>
                <a 
                  href="https://wa.me/77001234567" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="font-medium text-black hover:underline"
                >
                  +7 (700) 123-45-67
                </a>
              </li>
              <li>
                <span className="text-zinc-400 block">Мекенжай:</span>
                <span>Алматы қ., Абай даңғылы, 150</span>
              </li>
            </ul>
          </div>

          {/* Әлеуметтік желілер & 2GIS */}
          <div>
            <h4 className="font-semibold text-black mb-3 text-xs uppercase tracking-wider">Біз әлеуметтік желіде</h4>
            <div className="flex flex-col gap-2 text-xs">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-medium text-black hover:opacity-80 transition"
              >
                <span>📸 Instagram:</span>
                <span className="underline">@beles.education</span>
              </a>

              <a
                href="https://2gis.kz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-medium text-emerald-600 hover:underline transition"
              >
                <span>🗺️ 2GIS картада көру</span>
              </a>
            </div>
          </div>

        </div>

        {/* Төменгі авторлық құқық бөлігі */}
        <div className="border-t border-zinc-200 pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-400">
          <p>© {new Date().getFullYear()} Beles Education. Барлық құқықтар қорғалған.</p>
          <div className="flex gap-4 mt-2 sm:mt-0">
            <Link href="/privacy" className="hover:underline">Купиялылық саясаты</Link>
            <Link href="/terms" className="hover:underline">Қолдану шарттары</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
