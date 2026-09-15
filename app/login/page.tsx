import Link from 'next/link'
import Image from 'next/image'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-zinc-50 p-8 rounded-2xl border border-zinc-200 shadow-sm">
        
        {/* Логотип */}
        <div className="flex flex-col items-center">
          <Link href="/">
            <Image 
              src="/logo.png" 
              alt="Beles Education Logo" 
              width={180} 
              height={50} 
              priority
              className="h-auto w-auto"
            />
          </Link>
          <h2 className="mt-6 text-2xl font-extrabold text-black tracking-tight">
            Жүйеге кіру
          </h2>
          <p className="mt-2 text-sm text-zinc-600 text-center">
            Аккаунтыңызға кіріп, оқуды жалғастырыңыз.
          </p>
        </div>

        {/* Оқушы / Мұғалім табуляциясы */}
        <div className="grid grid-cols-2 gap-1 bg-zinc-200/60 p-1 rounded-xl text-center text-sm font-semibold">
          <button type="button" className="py-2 rounded-lg bg-white text-black shadow-sm">
            Оқушы
          </button>
          <button type="button" className="py-2 rounded-lg text-zinc-600 hover:text-black transition-colors">
            Мұғалім
          </button>
        </div>

        {/* Форма */}
        <form className="mt-8 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              placeholder="мысалы: user@gmail.com"
              className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-sm text-black placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1">
              Құпия сөз
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-lg text-sm text-black placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-black text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-all shadow-sm"
          >
            Кіру
          </button>
        </form>

        <p className="text-center text-sm text-zinc-600 pt-2">
          Аккаунтыңыз жоқ па?{' '}
          <Link href="/register" className="font-semibold text-black hover:underline">
            Тіркелу
          </Link>
        </p>

      </div>
    </div>
  )
}
