const students = [
  { name: "Айдана Т.", lastScore: 96, status: "Тапсырды" },
  { name: "Мирас Қ.", lastScore: 94, status: "Тапсырды" },
  { name: "Аяжан С.", lastScore: 91, status: "Тапсырды" },
  { name: "Дархан Е.", lastScore: 0, status: "Тапсырмады" },
];

export default function TeacherDashboard() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-ink-soft">
            Мұғалім кабинеті
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
            Математика тобы
          </h1>
        </div>
        <button className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-accent-hover">
          + Жаңа тест құру
        </button>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-card lg:col-span-1">
          <h2 className="text-[16px] font-semibold text-ink">
            Материал жүктеу
          </h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            PDF, презентация немесе тапсырмалар файлын қосыңыз.
          </p>
          <div className="mt-5 flex h-28 items-center justify-center rounded-xl border border-dashed border-line text-[13px] text-ink-faint">
            Файлды осы жерге тастаңыз
          </div>
          <button className="mt-4 w-full rounded-full border border-line py-2.5 text-[13px] font-medium text-ink hover:bg-paper-tint">
            Файл таңдау
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-ink">
              Сәрсенбі тестінің нәтижелері
            </h2>
            <span className="text-[12px] text-ink-faint">4 / 28 оқушы</span>
          </div>
          <table className="mt-5 w-full text-left text-[13px]">
            <thead>
              <tr className="text-[11px] font-medium text-ink-faint">
                <th className="pb-3 font-medium">Оқушы</th>
                <th className="pb-3 font-medium">Бал</th>
                <th className="pb-3 font-medium">Күй</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.name} className="border-t border-line/60">
                  <td className="py-3 font-medium text-ink">{s.name}</td>
                  <td className="py-3 text-ink">
                    {s.lastScore > 0 ? s.lastScore : "—"}
                  </td>
                  <td className="py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
                        s.status === "Тапсырды"
                          ? "bg-accent-soft text-accent-deep"
                          : "bg-paper-tint text-ink-faint"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
