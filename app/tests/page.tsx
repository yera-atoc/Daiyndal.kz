const tests = [
  { day: "Сәрсенбі", subject: "Математика", time: "19:00", status: "Ашық" },
  { day: "Жексенбі", subject: "Ағылшын тілі", time: "12:00", status: "Жоспарда" },
  { day: "Сәрсенбі", subject: "Биология", time: "19:00", status: "Жоспарда" },
  { day: "Жексенбі", subject: "Орыс тілі", time: "12:00", status: "Жоспарда" },
];

export default function TestsPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-14">
      <p className="text-[13px] font-medium text-ink-soft">Тестілер</p>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
        Апта сайынғы кесте
      </h1>
      <p className="mt-2 text-[13px] text-ink-faint">
        Әр сәрсенбі және жексенбі сайын жаңа тест қолжетімді болады.
      </p>

      <div className="mt-8 space-y-3">
        {tests.map((t, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-card"
          >
            <div className="flex items-center gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-paper-tint text-[11px] font-semibold text-ink-soft">
                {t.day.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-[14px] font-medium text-ink">
                  {t.subject}
                </p>
                <p className="text-[12px] text-ink-faint">
                  {t.day} · {t.time}
                </p>
              </div>
            </div>
            {t.status === "Ашық" ? (
              <button className="rounded-full bg-accent px-4 py-2 text-[12px] font-medium text-white hover:bg-accent-hover">
                Тестті бастау
              </button>
            ) : (
              <span className="rounded-full bg-paper-tint px-4 py-2 text-[12px] font-medium text-ink-faint">
                Жоспарда
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
