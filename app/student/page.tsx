import RequireRole from "@/components/RequireRole";

const subjects = [
  { name: "Математика", percent: 82 },
  { name: "Ағылшын тілі", percent: 74 },
  { name: "Биология", percent: 65 },
];

export default function StudentDashboard() {
  return (
    <RequireRole allow={["student"]}>
      <StudentDashboardContent />
    </RequireRole>
  );
}

function StudentDashboardContent() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-ink-soft">
            Оқушы кабинеті
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
            Сәлем, Айдана!
          </h1>
        </div>
        <span className="rounded-full bg-paper-tint px-4 py-1.5 text-[12px] font-medium text-ink-soft">
          НИШ КТЛ · 6 сынып
        </span>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-card">
          <p className="text-[12px] font-medium text-ink-faint">
            Жалпы рейтинг
          </p>
          <p className="mt-2 text-3xl font-semibold text-ink">#12</p>
          <p className="mt-1 text-[12px] text-ink-faint">245 оқушы ішінде</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-card">
          <p className="text-[12px] font-medium text-ink-faint">
            Соңғы тест балы
          </p>
          <p className="mt-2 text-3xl font-semibold text-ink">88</p>
          <p className="mt-1 text-[12px] text-ink-faint">100 балдан</p>
        </div>
        <div className="rounded-2xl bg-ink p-6 text-white">
          <p className="text-[12px] font-medium text-white/50">
            Келесі тест
          </p>
          <p className="mt-2 font-display text-2xl font-semibold">
            Сәрсенбі, 19:00
          </p>
          <p className="mt-1 text-[12px] text-white/40">Математика</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
        <h2 className="text-[16px] font-semibold text-ink">
          Пәндер бойынша прогресс
        </h2>
        <div className="mt-5 space-y-5">
          {subjects.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between text-[13px]">
                <span className="font-medium text-ink">{s.name}</span>
                <span className="text-ink-faint">{s.percent}%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-paper-tint">
                <div
                  className="h-1.5 rounded-full bg-accent"
                  style={{ width: `${s.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
