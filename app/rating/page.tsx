const leaderboard = [
  { rank: 1, name: "Айдана Т.", program: "НИШ КТЛ", score: 96 },
  { rank: 2, name: "Мирас Қ.", program: "РФМШ", score: 94 },
  { rank: 3, name: "Аяжан С.", program: "НИШ КТЛ", score: 91 },
  { rank: 4, name: "Дархан Е.", program: "РФМШ", score: 88 },
  { rank: 5, name: "Бекзат Н.", program: "КТЛ", score: 85 },
  { rank: 6, name: "Әсел Қ.", program: "НИШ КТЛ", score: 83 },
];

export default function RatingPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-14">
      <p className="text-[13px] font-medium text-ink-soft">
        Апталық рейтинг
      </p>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
        Осы аптаның үздіктері
      </h1>
      <p className="mt-2 text-[13px] text-ink-faint">
        Сәрсенбі және жексенбі тестілерінің нәтижелері бойынша.
      </p>

      <div className="mt-8 rounded-2xl bg-white shadow-card">
        {leaderboard.map((r, i) => (
          <div
            key={r.rank}
            className={`flex items-center justify-between px-6 py-4 ${
              i !== leaderboard.length - 1 ? "border-b border-line/60" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold ${
                  r.rank === 1
                    ? "bg-ink text-white"
                    : "bg-paper-tint text-ink-soft"
                }`}
              >
                {r.rank}
              </span>
              <div>
                <p className="text-[14px] font-medium text-ink">{r.name}</p>
                <p className="text-[12px] text-ink-faint">{r.program}</p>
              </div>
            </div>
            <span className="text-[16px] font-semibold text-accent">
              {r.score}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
