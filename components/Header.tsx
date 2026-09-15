import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="w-full border-b border-zinc-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Жаңа Логотип */}
        <Link href="/" className="flex items-center">
          <Image 
            src="/logo.png" 
            alt="Beles Education Logo" 
            width={140} 
            height={40} 
            priority
            className="h-9 w-auto object-contain"
          />
        </Link>
        
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-zinc-600">
          <Link href="/#pans" className="hover:text-black transition-colors">Пәндер</Link>
          <Link href="/#bagdarlama" className="hover:text-black transition-colors">Бағдарламалар</Link>
          <Link href="/tests" className="hover:text-black transition-colors">Тест банкі</Link>
          <Link href="/materials" className="hover:text-black transition-colors">Материалдар</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link 
            href="/login" 
            className="px-4 py-2 text-sm font-semibold text-black hover:text-zinc-600 transition-colors"
          >
            Кіру
          </Link>
          <Link 
            href="/tests" 
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-zinc-800 transition-all duration-200"
          >
            Тесттерді көру
          </Link>
        </div>
      </div>
    </header>
  );
}
