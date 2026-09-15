import Link from 'next/link';
import Header from '@/components/Header';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Сол жақ: Текст пен Батырмалар */}
          <div className="lg:col-span-7 space-y-6">
            <span className="inline-block px-3 py-1 bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold rounded-full tracking-wide">
              5-6 сынып оқушыларына арналған
            </span>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-black tracking-tight leading-tight">
              НИШ(НЗМ), БИЛ, РФМШ, ЕНТ(ҰБТ) емтихандарына дайындал
            </h1>

            <p className="text-base sm:text-lg text-zinc-600 max-w-xl leading-relaxed">
              Алты пән бойынша апта сайынғы тесттер. Барлық материал қазақ тілінде, нәтижелер бірден көрінеді.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/tests"
                className="px-6 py-3.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-all shadow-sm"
              >
                Тест банкін көру
              </Link>
              <Link
                href="#courses"
                className="px-6 py-3.5 border border-zinc-300 text-black text-sm font-semibold rounded-lg hover:border-black transition-all bg-white"
              >
                Бағдарламалар
              </Link>
            </div>
          </div>

          {/* Оң жақ: Апталық кесте карточкасы */}
          <div className="lg:col-span-5">
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-bold text-black mb-6">
                Апталық кесте
              </h3>

              <div className="flex justify-between items-center py-4 border-b border-zinc-200">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-zinc-400">Дс</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-zinc-400">Сс</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-black uppercase tracking-wider">тест</span>
                  <span className="text-sm font-bold text-black border-2 border-black rounded-full w-9 h-9 flex items-center justify-center bg-white">Ср</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-zinc-400">Бс</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-zinc-400">Жм</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-zinc-400">Сб</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-black uppercase tracking-wider">тест</span>
                  <span className="text-sm font-bold text-black border-2 border-black rounded-full w-9 h-9 flex items-center justify-center bg-white">Жс</span>
                </div>
              </div>

              <p className="text-xs text-zinc-500 mt-6 leading-relaxed">
                Сәрсенбі мен жексенбі сайын — жаңа тест, жеке нәтиже.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
