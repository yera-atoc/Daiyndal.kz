export default function RegisterPage() {
  return (
    <section className="mx-auto flex max-w-sm flex-col px-6 py-16">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Тіркелу
      </h1>
      <p className="mt-2 text-[14px] text-ink-soft">
        Оқушы ретінде тіркеліп, апталық тестілерге қатысыңыз.
      </p>

      <form className="mt-8 space-y-4">
        <div>
          <label className="text-[13px] font-medium text-ink-soft">
            Аты-жөні
          </label>
          <input
            type="text"
            placeholder="Аты Тегі"
            className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-[14px] outline-none focus:border-accent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[13px] font-medium text-ink-soft">
              Сынып
            </label>
            <select className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-[14px] outline-none focus:border-accent">
              <option>5 сынып</option>
              <option>6 сынып</option>
            </select>
          </div>
          <div>
            <label className="text-[13px] font-medium text-ink-soft">
              Бағдарлама
            </label>
            <select className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-[14px] outline-none focus:border-accent">
              <option>НИШ</option>
              <option>КТЛ</option>
              <option>РФМШ</option>
            </select>
          </div>
        </div>

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
          Тіркелу
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-faint">
        Аккаунтыңыз бар ма?{" "}
        <a href="/login" className="font-medium text-accent">
          Кіру
        </a>
      </p>
    </section>
  );
}
