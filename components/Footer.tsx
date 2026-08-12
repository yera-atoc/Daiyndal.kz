export default function Footer() {
  return (
    <footer className="mt-32 border-t border-line/60 bg-paper-tint">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 text-ink-soft md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-semibold text-white">
              D
            </span>
            <span className="font-display text-sm font-semibold text-ink">
              Daiyndal.kz
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed">
            5-6 сынып оқушыларын НИШ, КТЛ және РФМШ емтихандарына дайындайтын
            онлайн платформа.
          </p>
        </div>

        <div>
          <p className="text-[13px] font-medium text-ink">Бағдарламалар</p>
          <ul className="mt-3 space-y-2 text-[13px]">
            <li>НИШ дайындық</li>
            <li>КТЛ дайындық</li>
            <li>РФМШ дайындық</li>
          </ul>
        </div>

        <div>
          <p className="text-[13px] font-medium text-ink">Платформа</p>
          <ul className="mt-3 space-y-2 text-[13px]">
            <li>Рейтинг</li>
            <li>Апта сайынғы тестілер</li>
            <li>Мұғалім кабинеті</li>
          </ul>
        </div>

        <div>
          <p className="text-[13px] font-medium text-ink">Байланыс</p>
          <ul className="mt-3 space-y-2 text-[13px]">
            <li>WhatsApp: жақында</li>
            <li>Instagram: @daiyndal.kz</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line/60 py-5 text-center text-[12px] text-ink-faint">
        © {new Date().getFullYear()} Daiyndal.kz. Барлық құқықтар қорғалған.
      </div>
    </footer>
  );
}
