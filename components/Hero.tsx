const preview = [
  { rank: 1, name: "Айдана Т.", program: "НИШ КТЛ", score: 96 },
  { rank: 2, name: "Мирас Қ.", program: "РФМШ", score: 94 },
  { rank: 3, name: "Аяжан С.", program: "НИШ КТЛ", score: 91 },
  { rank: 4, name: "Дархан Е.", program: "РФМШ", score: 88 },
];

export default function Hero() {
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-3xl px-6 pt-24 pb-16 text-center">
        <p className="text-[13px] font-medium text-ink-soft">
          5-6 сынып оқушыларына арналған
        </p>
        <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.08] tracking-tightest text-ink md:text-6xl">
          НИШ, КТЛ, РФМШ емтихандарына{" "}
          <span className="text-accent">дайындал</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-ink-soft">
          Апта сайын — сәрсенбі мен жексенбіде — тестілер, жеке рейтинг және
          барлық материал қазақ тілінде.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/register"
            className="rounded-full bg-accent px-6 py-3 text-[15px] font-medium text-white transition hover:bg-accent-hover"
          >
            Оқушыны тіркеу
          </a>
          <a
            href="#bagdarlamalar"
            className="rounded-full px-6 py-3 text-[15px] font-medium text-accent transition hover:bg-accent-soft"
          >
            Бағдарламаларды көру ›
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 pb-24">
        <div className="rounded-3xl bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between px-1 pb-5">
            <p className="text-[15px] font-semibold text-ink">
              Апталық рейтинг
            </p>
            <span className="text-[12px] font-medium text-ink-faint">
              Сәрсенбі тесті
            </span>
          </div>
          <div className="divide-y divide-line/60">
            {preview.map((row, i) => (
              <div
                key={row.rank}
                style={{ animationDelay: `${i * 80}ms` }}
                className="rise-row flex items-center justify-between py-3.5"
              >
                <div className="flex items-center gap-3.5">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-semibold ${
                      row.rank === 1
                        ? "bg-ink text-white"
                        : "bg-paper-tint text-ink-soft"
                    }`}
                  >
                    {row.rank}
                  </span>
                  <div className="text-left">
                    <p className="text-[14px] font-medium text-ink">
                      {row.name}
                    </p>
                    <p className="text-[12px] text-ink-faint">
                      {row.program}
                    </p>
                  </div>
                </div>
                <span className="text-[16px] font-semibold text-accent">
                  {row.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
