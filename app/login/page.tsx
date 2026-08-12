export default function LoginPage() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Жүйеге кіру
      </h1>
      <p className="mt-2 text-[14px] text-ink-soft">
        Аккаунтыңызға кіріп, оқуды жалғастырыңыз.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-paper-tint p-1">
        <button className="rounded-full bg-white py-2 text-[13px] font-medium text-ink shadow-card">
          Оқушы
        </button>
        <button className="rounded-full py-2 text-[13px] font-medium text-ink-faint">
          Мұғалім
        </button>
      </div>

      <form className="mt-8 space-y-4">
        <div>
          <label className="text-[13px] font-medium text-ink-soft">
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-[14px] outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-[13px] font-medium text-ink-soft">
            Құпия сөз
          </label>
          <input
            type="password"
            placeholder="••••••••"
            className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-[14px] outline-none focus:border-accent"
          />
        </div>
        <button
          type="button"
          className="w-full rounded-full bg-accent py-3 text-[14px] font-medium text-white transition hover:bg-accent-hover"
        >
          Кіру
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-faint">
        Аккаунтыңыз жоқ па?{" "}
        <a href="/register" className="font-medium text-accent">
          Тіркелу
        </a>
      </p>
    </section>
  );
}
