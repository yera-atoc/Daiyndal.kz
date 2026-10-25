import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { B, CONTACT, waLink } from '@/components/site/brand'

const PROGRAMS = [
  {
    tag: '5–6 сынып',
    title: 'НЗМ · БИЛ · РФМШ',
    text: 'Арнайы мектептерге түсу емтихандарына жүйелі дайындық.',
    items: ['Математика', 'Сандық сипаттама', 'Жаратылыстану', 'Қазақ, орыс, ағылшын тілдері'],
    color: B.blue,
  },
  {
    tag: '9–11 сынып',
    title: 'ҰБТ',
    text: 'Міндетті және бейіндік пәндер, ҰБТ форматындағы пробныйлар.',
    items: ['Қазақстан тарихы', 'Математикалық және оқу сауаттылығы', 'Бейіндік пәндер: 12 комбинация', '140 балдық толық пробный'],
    color: B.red,
  },
  {
    tag: 'Ағылшын тілі',
    title: 'IELTS · TOEFL',
    text: 'Академиялық ағылшын және халықаралық емтиханға дайындық.',
    items: ['Listening, Reading', 'Writing – мұғалім тексереді', 'Speaking – жазбамен', 'Нақты форматтағы mock'],
    color: B.ink,
  },
  {
    tag: '3–11 сынып',
    title: 'Пәндік сабақтар',
    text: 'Мектеп бағдарламасы бойынша үлгерімді көтеру.',
    items: ['Математика', 'Қазақ және орыс тілі', 'Ағылшын тілі', 'Ай сайынғы білім тексеру'],
    color: B.blue,
  },
]

const PLATFORM = [
  { href: '/bilim-test', title: 'Білім тексеру', text: 'Ай сайынғы сынақ: жауап парағын телефоннан белгілейсің, нәтиже, топтағы орын және PDF есеп.', cta: 'Кабинетке кіру' },
  { href: '/ubt', title: 'ҰБТ пробный', text: '120 тапсырма, 240 минут, 12 комбинация. 140 балл ресми ереже бойынша бірден есептеледі.', cta: 'Пробныйға кіру' },
  { href: '/ielts', title: 'IELTS mock', text: 'Listening, Reading, Writing, Speaking – таймермен, бір рет ойнайтын аудиомен, нақты емтихандағыдай.', cta: 'Mock-қа кіру' },
  { href: '/toefl', title: 'TOEFL mock', text: '2026 жылғы жаңа TOEFL iBT форматы: Complete the Words, Build a Sentence, Interview.', cta: 'Mock-қа кіру' },
  { href: '/materials', title: 'Оқу материалдары', text: 'Мұғалімдер жүктеген конспектілер, тапсырмалар және пайдалы сілтемелер.', cta: 'Ашу' },
  { href: '/ielts/materials', title: 'IELTS · TOEFL кеңестері', text: 'Формат, бағалау критерийлері, пайдалы тіркестер және ресми тегін ресурстар.', cta: 'Ашу' },
]

const STEPS = [
  ['Жазылу', 'WhatsApp арқылы жазыласыз, біз сынып пен мақсатқа қарай топ ұсынамыз.'],
  ['Деңгейді анықтау', 'Алғашқы Білім тексеру сынағы оқушының күшті және әлсіз тұстарын көрсетеді.'],
  ['Сабақтар', 'Тәжірибелі мұғалімдермен топтық сабақтар, үй тапсырмасы мен материалдар.'],
  ['Ай сайынғы нәтиже', 'Әр айдың соңында сынақ, рейтинг және ата-анаға арналған PDF есеп.'],
]

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: B.paper, color: B.ink }}>
      <Header />

      {/* Hero */}
      <section className="border-b bg-white" style={{ borderColor: B.line }}>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: B.line, color: B.muted }}>
              <span className="h-2 w-2 rounded-full" style={{ background: B.red }} /> Жезқазған · сабақтар және онлайн платформа
            </span>
            <h1 className="font-display mt-5 text-[2rem] font-semibold leading-[1.15] sm:text-5xl">
              НЗМ, БИЛ, РФМШ және ҰБТ-ға <span style={{ color: B.blue }}>сенімді</span> дайындық
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: B.muted }}>
              Beles education – тәжірибелі мұғалімдер, ай сайынғы Білім тексеру сынағы және ҰБТ, IELTS, TOEFL пробныйлары бір жерде. Оқушы нәтижесін кабинетінен, ата-ана – PDF есептен көреді.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={waLink('Сәлеметсіз бе! Балама дайындық сабағына жазылғым келеді.')} target="_blank" rel="noopener noreferrer" className="rounded-xl px-6 py-3.5 text-center text-sm font-semibold text-white transition hover:opacity-90" style={{ background: B.blue }}>
                Сабаққа жазылу (WhatsApp)
              </a>
              <Link href="/login" className="rounded-xl border bg-white px-6 py-3.5 text-center text-sm font-semibold transition hover:border-black" style={{ borderColor: B.line }}>
                Кабинетке кіру
              </Link>
            </div>
          </div>

          {/* Нәтиже парағының үлгісі */}
          <div className="rounded-3xl border p-5 shadow-sm sm:p-6" style={{ borderColor: B.line, background: B.paper }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: B.muted }}>Білім тексеру · нәтиже үлгісі</span>
              <span className="flex h-5 items-stretch gap-[3px]" aria-hidden>
                {[3, 1, 2, 1, 3, 1, 1, 2].map((w, i) => <span key={i} style={{ width: w * 2, background: i % 3 === 2 ? B.blue : B.ink }} />)}
              </span>
            </div>
            <div className="mt-4 rounded-2xl bg-white p-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs" style={{ color: B.muted }}>Жалпы балл</div>
                  <div className="font-display text-4xl font-semibold">1 180<span className="text-lg" style={{ color: B.muted }}> / 1500</span></div>
                </div>
                <span className="rounded-lg px-2.5 py-1 text-xs font-bold text-white" style={{ background: B.red }}>+120 өткен айдан</span>
              </div>
              <div className="mt-4 space-y-2.5">
                {[['Математика', 84], ['Сандық сипаттама', 76], ['Жаратылыстану', 81], ['Қазақ тілі', 70], ['Ағылшын тілі', 88]].map(([n, v]) => (
                  <div key={n as string}>
                    <div className="flex justify-between text-xs"><span>{n}</span><span className="font-semibold">{v}%</span></div>
                    <div className="mt-1 h-2 rounded-full" style={{ background: B.line }}><div className="h-2 rounded-full" style={{ width: `${v}%`, background: (v as number) >= 80 ? B.blue : B.ink }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-xs" style={{ color: B.muted }}>Әр оқушы сынақтан кейін осындай нәтиже, тақырыптар бойынша талдау және болжам алады.</p>
          </div>
        </div>
      </section>

      {/* Бағдарламалар */}
      <section id="programs" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Бағдарламалар</h2>
        <p className="mt-2 max-w-2xl" style={{ color: B.muted }}>Оқушының сыныбы мен мақсатына қарай топ таңдаймыз. Бағасы мен кестесі бойынша WhatsApp-қа жазыңыз.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROGRAMS.map((p) => (
            <div key={p.title} className="flex flex-col rounded-2xl border bg-white p-5" style={{ borderColor: B.line }}>
              <span className="self-start rounded-md px-2 py-0.5 text-xs font-semibold text-white" style={{ background: p.color }}>{p.tag}</span>
              <h3 className="font-display mt-3 text-xl font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm" style={{ color: B.muted }}>{p.text}</p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                {p.items.map((it) => <li key={it} className="flex gap-2"><span style={{ color: p.color }}>—</span>{it}</li>)}
              </ul>
              <a href={waLink(`Сәлеметсіз бе! «${p.title}» (${p.tag}) бағдарламасы туралы білгім келеді.`)} target="_blank" rel="noopener noreferrer" className="mt-5 rounded-lg border px-4 py-2.5 text-center text-sm font-semibold transition hover:border-black" style={{ borderColor: B.line }}>
                Толығырақ білу
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Платформа */}
      <section id="platform" className="scroll-mt-16 text-white" style={{ background: B.ink }}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Онлайн платформа</h2>
          <p className="mt-2 max-w-2xl text-white/70">Орталық оқушылары үшін. Кіру үшін аты-жөніңізді таңдап, мұғалім берген 4 таңбалы PIN кодты енгізесіз.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM.map((c) => (
              <Link key={c.href} href={c.href} className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/40 hover:bg-white/[0.08]">
                <h3 className="text-lg font-semibold">{c.title}</h3>
                <p className="mt-2 flex-1 text-sm text-white/70">{c.text}</p>
                <span className="mt-4 text-sm font-semibold" style={{ color: '#8FB3FF' }}>{c.cta} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Қалай оқимыз */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Қалай оқимыз</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="rounded-2xl border bg-white p-5" style={{ borderColor: B.line }}>
              <span className="font-display text-3xl font-semibold" style={{ color: i % 2 ? B.red : B.blue }}>0{i + 1}</span>
              <h3 className="mt-2 font-semibold">{t}</h3>
              <p className="mt-1 text-sm" style={{ color: B.muted }}>{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Байланыс */}
      <section id="contact" className="scroll-mt-20 border-t bg-white" style={{ borderColor: B.line }}>
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">Байланыс</h2>
            <p className="mt-2" style={{ color: B.muted }}>Сабақ кестесі, бағасы және бос орындар туралы сұрақтарға WhatsApp-та жауап береміз.</p>
            <dl className="mt-6 space-y-4 text-sm">
              <div><dt style={{ color: B.muted }}>Мекенжай</dt><dd className="mt-0.5 text-base font-semibold">{CONTACT.address}</dd></div>
              <div><dt style={{ color: B.muted }}>WhatsApp</dt><dd className="mt-0.5 text-base font-semibold"><a href={waLink()} target="_blank" rel="noopener noreferrer" className="hover:underline">{CONTACT.phone}</a></dd></div>
              <div><dt style={{ color: B.muted }}>Instagram</dt><dd className="mt-0.5 text-base font-semibold"><a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer" className="hover:underline">{CONTACT.instagramHandle}</a></dd></div>
            </dl>
          </div>
          <div className="flex flex-col justify-between gap-6 rounded-3xl p-6 text-white sm:p-8" style={{ background: B.blue }}>
            <div>
              <h3 className="font-display text-xl font-semibold sm:text-2xl">Алғашқы сынаққа келіңіз</h3>
              <p className="mt-2 text-white/85">Білім тексеру сынағы оқушының қазіргі деңгейін көрсетеді – сол бойынша дайындық жоспарын құрамыз.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href={waLink('Сәлеметсіз бе! Білім тексеру сынағына жазылғым келеді.')} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold" style={{ color: B.blue }}>WhatsApp-қа жазу</a>
              <a href={CONTACT.gis} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/50 px-5 py-3 text-center text-sm font-semibold">2GIS картасы ↗</a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
