import Hero from "@/components/Hero";
import PricingCard from "@/components/PricingCard";

const subjects = [
  { name: "Математика", note: "логика және есеп шығару" },
  { name: "Ағылшын тілі", note: "грамматика және лексика" },
  { name: "Биология", note: "табиғат және тірі ағзалар" },
  { name: "Орыс тілі", note: "грамматика және оқу" },
  { name: "Қазақ тілі", note: "грамматика және шығармашылық" },
];

const features = [
  {
    title: "Апта сайынғы тест",
    text: "Әр сәрсенбі және жексенбі сайын пән бойынша білімді тексеретін тест өтеді.",
  },
  {
    title: "Жеке рейтинг",
    text: "Әр оқушының апталық және жалпы рейтингі бағдарлама бойынша көрсетіледі.",
  },
  {
    title: "Оқушы кабинеті",
    text: "Тест нәтижелері, прогресс және келесі тест уақыты бір жерде.",
  },
  {
    title: "Мұғалім кабинеті",
    text: "Материал жүктеу, тест құру және оқушылар нәтижесін бақылау.",
  },
];

export default function Home() {
  return (
    <>
      <Hero />

      <section className="bg-paper-tint py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-[13px] font-medium text-ink-soft">
            Пәндер
          </p>
          <h2 className="mt-2 text-center font-display text-3xl font-semibold tracking-tight text-ink">
            Бір платформада — барлық қажетті пән
          </h2>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {subjects.map((s) => (
              <div
                key={s.name}
                className="rounded-2xl bg-white p-5 shadow-card"
              >
                <p className="text-[14px] font-medium text-ink">{s.name}</p>
                <p className="mt-1.5 text-[12px] text-ink-faint">{s.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-[13px] font-medium text-ink-soft">
            Мүмкіндіктер
          </p>
          <h2 className="mt-2 text-center font-display text-3xl font-semibold tracking-tight text-ink">
            Платформа қалай көмектеседі
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-paper-tint p-7"
              >
                <h3 className="text-[16px] font-semibold text-ink">
                  {f.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="bagdarlamalar" className="bg-paper-tint py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-[13px] font-medium text-ink-soft">
            Бағдарламалар
          </p>
          <h2 className="mt-2 text-center font-display text-3xl font-semibold tracking-tight text-ink">
            Мектебіңізге сай бағдарламаны таңдаңыз
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <PricingCard
              program="НИШ"
              price="60 000"
              description="Назарбаев Зияткерлік мектептеріне түсуге толық дайындық."
              subjects={["Математика", "Ағылшын тілі", "Биология"]}
              featured
            />
            <PricingCard
              program="КТЛ"
              price="30 000"
              description="Қазақстан-Түркия лицейіне түсу емтиханына дайындық."
              subjects={["Математика", "Ағылшын тілі"]}
            />
            <PricingCard
              program="РФМШ"
              price="30 000"
              description="Республикалық физика-математика мектебіне дайындық."
              subjects={["Математика", "Орыс тілі"]}
            />
          </div>
        </div>
      </section>

      <section id="mugalimder" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-[13px] font-medium text-ink-soft">
            Топ
          </p>
          <h2 className="mt-2 text-center font-display text-3xl font-semibold tracking-tight text-ink">
            Тәжірибелі мұғалімдер тобы
          </h2>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Математика мұғалімі",
              "Ағылшын тілі мұғалімі",
              "Биология мұғалімі",
              "Орыс және қазақ тілі мұғалімі",
            ].map((role) => (
              <div
                key={role}
                className="rounded-2xl bg-paper-tint p-5"
              >
                <div className="h-9 w-9 rounded-full bg-accent-soft" />
                <p className="mt-3 text-[13px] font-medium text-ink">
                  {role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-28 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Балаңыздың орны рейтингте жоғары болсын
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[15px] text-ink-soft">
          Бүгін тіркеліп, осы сәрсенбіден бастап апталық тестілерге қатысыңыз.
        </p>
        <a
          href="/register"
          className="mt-8 inline-block rounded-full bg-accent px-7 py-3.5 text-[15px] font-medium text-white transition hover:bg-accent-hover"
        >
          Қазір тіркелу
        </a>
      </section>
    </>
  );
}
