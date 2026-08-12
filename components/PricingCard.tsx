type Props = {
  program: string;
  price: string;
  description: string;
  subjects: string[];
  featured?: boolean;
};

export default function PricingCard({
  program,
  price,
  description,
  subjects,
  featured = false,
}: Props) {
  return (
    <div
      className={`flex flex-col rounded-3xl p-8 ${
        featured
          ? "bg-white shadow-soft ring-1 ring-accent/40"
          : "bg-paper-tint"
      }`}
    >
      {featured && (
        <span className="mb-4 inline-block w-fit rounded-full bg-accent-soft px-3 py-1 text-[11px] font-medium text-accent-deep">
          Ұсынылады
        </span>
      )}
      <p className="text-[13px] font-medium text-ink-soft">{program}</p>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-tight text-ink">
          {price}
        </span>
        <span className="text-sm text-ink-faint">тг / ай</span>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
        {description}
      </p>

      <ul className="mt-6 space-y-2.5 text-[13px] text-ink">
        {subjects.map((s) => (
          <li key={s} className="flex items-center gap-2.5">
            <span className="h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
            {s}
          </li>
        ))}
      </ul>

      <button
        className={`mt-8 rounded-full px-5 py-3 text-[13px] font-medium transition ${
          featured
            ? "bg-accent text-white hover:bg-accent-hover"
            : "bg-white text-ink hover:bg-white/60"
        }`}
      >
        Тіркелу
      </button>
    </div>
  );
}
