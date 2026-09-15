import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="w-full border-t border-zinc-200 bg-white py-12 text-zinc-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* 1. Логотип & Сипаттама */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/">
              <Image 
                src="/logo.png" 
                alt="Beles Education Logo" 
                width={130} 
                height={40} 
                className="h-8 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-zinc-500 leading-relaxed">
              НИШ, БИЛ, РФМШ және ҰБТ емтихандарына сапалы онлайн дайындық платформасы.
            </p>
          </div>

          {/* 2. Навигация */}
          <div>
            <h4 className="text-sm font-bold text-black uppercase tracking-wider mb-4">Бөлімдер</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/#pans" className="hover:text-black transition-colors">Пәндер</Link></li>
              <li><Link href="/#bagdarlama" className="hover:text-black transition-colors">Бағдарламалар</Link></li>
              <li><Link href="/tests" className="hover:text-black transition-colors">Тест банкі</Link></li>
              <li><Link href="/materials" className="hover:text-black transition-colors">Материалдар</Link></li>
            </ul>
          </div>

          {/* 3. Бағыттар */}
          <div>
            <h4 className="text-sm font-bold text-black uppercase tracking-wider mb-4">Дайындық</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li>НИШ (5-6 сынып)</li>
              <li>БИЛ (5-6 сынып)</li>
              <li>РФМШ (5-6 сынып)</li>
              <li>ҰБТ / ЕНТ (9-11 сынып)</li>
            </ul>
          </div>

          {/* 4. Байланыс (WhatsApp & Instagram) */}
          <div>
            <h4 className="text-sm font-bold text-black uppercase tracking-wider mb-4">Байланыс</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <span className="block text-xs text-zinc-400">WhatsApp / Администратор:</span>
                <a 
                  href="https://wa.me/77772739248" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold text-black hover:underline flex items-center gap-1.5 mt-0.5"
                >
                  +7 777 273 92 48
                </a>
              </li>
              <li>
                <span className="block text-xs text-zinc-400">Instagram:</span>
                <a 
                  href="https://instagram.com/beleseducation" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold text-black hover:underline flex items-center gap-1.5 mt-0.5"
                >
                  @beleseducation
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-12 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-400">
          <p>© {new Date().getFullYear()} Beles Education. Барлық құқықтар қорғалған.</p>
        </div>
      </div>
    </footer>
  );
}
