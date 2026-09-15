import Link from 'next/link';

export default function Header() {
  return (
    <header className="w-full border-b border-zinc-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight text-black">
          Beles
        </Link>
        
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-zinc-600">
          <Link href="/ пәндер" className="hover:text-black transition-colors">Пәндер</Link>
          <Link href="/#courses" className="hover:text-black transition-colors">НИШ(НЗМ) · БИЛ · РФМШ · ЕНТ(ҰБТ)</Link>
          <Link href="/tests" className="hover:text-black transition-colors">Тест банкі</Link>
          <Link href="/materials" className="hover:text-black transition-colors">Материалдар</Link>
        </nav>

        <div>
          <Link 
            href="/tests" 
            className="px-4 py-2 text-sm font-medium text-black border border-black rounded-lg hover:bg-black hover:text-white transition-all duration-200"
          >
            Тесттерді көру
          </Link>
        </div>
      </div>
    </header>
  );
}
