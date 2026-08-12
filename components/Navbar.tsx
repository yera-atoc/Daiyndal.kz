import Link from "next/link";

const links = [
  { href: "/#bagdarlamalar", label: "Бағдарламалар" },
  { href: "/rating", label: "Рейтинг" },
  { href: "/tests", label: "Тестілер" },
  { href: "/#mugalimder", label: "Мұғалімдер" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-sm font-semibold text-white">
            D
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
            Daiyndal.kz
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium text-ink-soft transition hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="hidden text-[13px] font-medium text-ink-soft hover:text-ink sm:block"
          >
            Кіру
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-accent-hover"
          >
            Тіркелу
          </Link>
        </div>
      </div>
    </header>
  );
}
