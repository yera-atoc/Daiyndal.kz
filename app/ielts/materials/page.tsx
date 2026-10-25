import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'IELTS · TOEFL дайындық материалдары · Beles' }

const INK = '#111827'
const BLUE = '#2B6BF3'
const LINE = '#E3E7F0'
const MUTED = '#6B7385'

// Ресми тегін ресурстар: сілтемелер ғана (материалдар сол сайттарда ашылады)
const OFFICIAL: { org: string; links: [string, string, string][] }[] = [
  {
    org: 'British Council',
    links: [
      ['Listening · Academic', 'Ресми тегін практикалық тест', 'https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/academic/listening'],
      ['Reading · Academic', 'Ресми тегін практикалық тест', 'https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/academic/reading'],
      ['Writing · Academic', 'Тапсырмалар мен үлгі жауаптар', 'https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/academic/writing'],
      ['Speaking · Academic', 'Сұрақтар мен бейнежазбалар', 'https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/academic/speaking'],
      ['IELTS on Computer', 'Компьютерлік форматпен танысу тесті', 'https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests/ielts-familiarisation-test'],
      ['IELTS Ready', 'Тіркелу арқылы тегін дайындық пакеті', 'https://takeielts.britishcouncil.org/prepare/ielts-ready'],
      ['Бейнесабақтар', 'Әр бөлімге арналған видеолар', 'https://takeielts.britishcouncil.org/prepare/ielts-preparation-materials/videos'],
    ],
  },
  {
    org: 'IDP IELTS',
    links: [
      ['Барлық практикалық тесттер', 'Listening, Reading, Writing, Speaking', 'https://ielts.idp.com/prepare/all-test-types/all-skills/practice-test'],
      ['Academic Reading', 'Тегін сұрақтар', 'https://ielts.idp.com/uae/prepare/article-academic-reading-free-practice-questions'],
      ['Academic Writing', 'Тегін тапсырмалар', 'https://ielts.idp.com/uae/prepare/article-academic-writing-free-practice-questions'],
    ],
  },
  {
    org: 'Бағалау критерийлері (ресми)',
    links: [
      ['Writing band descriptors', 'Емтихан алушылар қолданатын критерийлер, PDF', 'https://ielts.org/cdn/ielts-downloadable-assets/ielts-guidance-and-support/ielts-guides/ielts-writing-band-descriptors.pdf'],
      ['Speaking band descriptors', 'Критерийлердің түсіндірмесі', 'https://ielts.com.au/australia/prepare/article-understanding-the-ielts-speaking-band-descriptors'],
    ],
  },
]

const FORMAT = [
  ['Listening', '≈ 30 мин', '4 бөлім · 40 сұрақ', 'Аудио бір рет қана ойнайды. Компьютерде жауапты тыңдап отырып енгізесіз.'],
  ['Reading', '60 мин', '3 мәтін · 40 сұрақ', 'Мәтіндер журнал, кітап, газеттен алынады. Қосымша уақыт берілмейді.'],
  ['Writing', '60 мин', '2 тапсырма', 'Task 1 — график/кестені сипаттау (≥150 сөз, ~20 мин). Task 2 — эссе (≥250 сөз, ~40 мин). Task 2 екі есе салмақты.'],
  ['Speaking', '11–14 мин', '3 бөлім', 'Емтихан алушымен бетпе-бет сұхбат: таныстыру, 2 минуттық монолог, талқылау.'],
]

const TOEFL_FORMAT = [
  ['Reading', '≈ 30 мин', 'Complete the Words · Read in Daily Life · Read an Academic Passage', 'Сөздердің жетпейтін әріптерін толтыру, күнделікті мәтіндер (email, хабарландыру), ~200 сөздік академиялық мәтін.'],
  ['Listening', '≈ 29 мин', 'Choose a Response · Conversation · Announcement · Academic Talk', 'Қысқа сөзге дұрыс жауап таңдау, диалогтар, хабарландырулар, қысқа дәрістер.'],
  ['Writing', '≈ 23 мин', 'Build a Sentence · Write an Email (7 мин) · Academic Discussion (10 мин)', 'Сөздерден сөйлем құрау, жағдайға email жазу, форумдағы талқылауға пікір жазу.'],
  ['Speaking', '≈ 8 мин', 'Listen and Repeat · Take an Interview', 'Естіген сөйлемді дәл қайталау; сұхбат сұрақтарына 45 секундтан жауап беру.'],
]

const BANDS: [string, string, string][] = [
  ['39–40', '39–40', '9.0'], ['37–38', '37–38', '8.5'], ['35–36', '35–36', '8.0'], ['32–34', '33–34', '7.5'], ['30–31', '30–32', '7.0'],
  ['26–29', '27–29', '6.5'], ['23–25', '23–26', '6.0'], ['18–22', '19–22', '5.5'], ['16–17', '15–18', '5.0'], ['13–15', '13–14', '4.5'], ['10–12', '10–12', '4.0'],
]

const TIPS: [string, string[]][] = [
  ['Listening', [
    'Аудио басталмай тұрып сұрақтарды оқып, қандай ақпарат керек екенін (сан, атау, күн) белгілеп алыңыз.',
    'Сөз шегіне назар аударыңыз: «ONE WORD AND/OR A NUMBER» болса, екі сөз жазу — қате.',
    'Спикерлер жиі ойын өзгертеді («Actually, let\'s make it Thursday»). Соңғы айтылған нұсқаны жазыңыз.',
    'Емле маңызды: аттар әріптеп айтылғанда мұқият жазыңыз.',
  ]],
  ['Reading', [
    'Әр мәтінге шамамен 20 минут бөліңіз. Бір сұраққа тұрып қалмаңыз.',
    'TRUE/FALSE/NOT GIVEN: FALSE — мәтін керісінше айтады; NOT GIVEN — мәтінде бұл туралы ақпарат жоқ.',
    'Сұрақтар әдетте мәтіннің ретімен жүреді (matching пен summary-ден басқа).',
    'Синонимдерді іздеңіз: сұрақтағы сөз мәтінде басқаша жазылуы мүмкін.',
  ]],
  ['Writing', [
    'Task 1: кіріспе (графикті өз сөзіңізбен) → overview (2 негізгі тренд) → 2 абзац мәліметпен. Пікір жазбаңыз.',
    'Task 2: сұраққа толық жауап беріңіз. Позицияңызды кіріспеде және қорытындыда анық жазыңыз.',
    'Әр абзацта бір негізгі ой + түсіндіру + мысал болсын.',
    'Соңғы 3–5 минутты қате тексеруге қалдырыңыз.',
  ]],
  ['Speaking', [
    'Part 1-де 2–3 сөйлеммен жауап беріңіз: жауап + себеп + мысал.',
    'Part 2-де дайындық минутында cue card-тағы әр пунктке 2–3 кілт сөз жазыңыз да, толық 2 минут сөйлеңіз.',
    'Part 3-те пікіріңізді дәлелдеңіз, салыстырыңыз, болашақ туралы болжам айтыңыз.',
    'Сөзді ұмытсаңыз, тоқтамаңыз — басқа сөзбен түсіндіріңіз (paraphrase).',
  ]],
]

const PHRASES: [string, string[]][] = [
  ['Writing Task 1', ['The chart illustrates / compares …', 'Overall, it is clear that …', 'rose sharply / fell steadily / remained stable', 'reached a peak of … in …', 'accounted for … %', 'In contrast, … / Similarly, …']],
  ['Writing Task 2', ['It is often argued that …', 'In my view, … / I firmly believe that …', 'One major advantage of … is that …', 'For instance, … / A clear example of this is …', 'On the other hand, …', 'In conclusion, …']],
  ['Speaking', ['That\'s an interesting question. I\'d say …', 'The main reason is that …', 'To give you an example, …', 'It depends on …', 'I\'ve never really thought about it, but …', 'Looking ahead, I think …']],
]

export default function IeltsMaterialsPage() {
  return (
    <main className="min-h-screen" style={{ background: '#F5F7FB', color: INK }}>
      <header className="border-b bg-white" style={{ borderColor: LINE }}>
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <img src="/beles-logo.png" alt="Beles" className="h-8 w-auto" />
          <div className="border-l pl-3 text-sm font-bold" style={{ borderColor: LINE }}>IELTS · TOEFL · дайындық материалдары</div>
          <Link href="/ielts" className="ml-auto rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: INK }}>Mock тесттер →</Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <Section title="IELTS Academic форматы">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left" style={{ color: MUTED }}><th className="py-2 pr-3 font-medium">Бөлім</th><th className="pr-3 font-medium">Уақыт</th><th className="pr-3 font-medium">Құрылымы</th><th className="font-medium">Ерекшелігі</th></tr></thead>
              <tbody>
                {FORMAT.map(([s, t, q, d]) => (
                  <tr key={s} className="border-t align-top" style={{ borderColor: LINE }}>
                    <td className="py-2 pr-3 font-bold">{s}</td><td className="whitespace-nowrap pr-3">{t}</td><td className="whitespace-nowrap pr-3">{q}</td><td className="py-2">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm" style={{ color: MUTED }}>Overall band — төрт бөлімнің орташасы, ең жақын 0,5-ке дөңгелектенеді (мысалы, 6,25 → 6,5; 6,75 → 7,0).</p>
        </Section>

        <Section title="TOEFL iBT форматы (2026 жылдан бастап)" note="2026 жылдың 21 қаңтарынан бастап TOEFL iBT жаңартылды: тест қысқарды (≈ 1,5–2 сағат), Reading мен Listening бейімделгіш (adaptive).">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left" style={{ color: MUTED }}><th className="py-2 pr-3 font-medium">Бөлім</th><th className="pr-3 font-medium">Уақыт</th><th className="pr-3 font-medium">Тапсырмалар</th><th className="font-medium">Не істейсіз</th></tr></thead>
              <tbody>
                {TOEFL_FORMAT.map(([sec, t, q, d]) => (
                  <tr key={sec} className="border-t align-top" style={{ borderColor: LINE }}>
                    <td className="py-2 pr-3 font-bold">{sec}</td><td className="whitespace-nowrap pr-3">{t}</td><td className="pr-3">{q}</td><td className="py-2">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm" style={{ color: MUTED }}>Нәтиже 1–6 шкаласымен беріледі (0,5 қадаммен), шамамен CEFR деңгейіне сәйкес: 6 ≈ C2, 5 ≈ C1, 4 ≈ B2, 3 ≈ B1. Overall — төрт бөлімнің орташасы. 2028 жылға дейін 0–120 шкаласындағы балл да қоса беріледі.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ['ETS · TOEFL дайындық', 'Ресми тегін практикалық тесттер мен сұрақ үлгілері', 'https://www.ets.org/toefl/prepare'],
              ['ETS · Тест құрылымы', 'Әр бөлімнің ресми сипаттамасы', 'https://www.ets.org/toefl/ibt/about/content/'],
            ].map(([t, d, href]) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="flex items-start justify-between gap-3 rounded-xl border bg-white p-3 hover:border-[#2B6BF3]" style={{ borderColor: LINE }}>
                <span><span className="block font-semibold">{t}</span><span className="text-sm" style={{ color: MUTED }}>{d}</span></span>
                <span style={{ color: BLUE }}>↗</span>
              </a>
            ))}
          </div>
        </Section>

        <Section title="IELTS: ресми тегін практикалық тесттер" note="Сілтемелер ресми сайттарға апарады. Материалдар British Council, IDP және Cambridge-ке тиесілі.">
          <div className="space-y-5">
            {OFFICIAL.map((g) => (
              <div key={g.org}>
                <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: MUTED }}>{g.org}</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {g.links.map(([t, d, href]) => (
                    <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="flex items-start justify-between gap-3 rounded-xl border bg-white p-3 hover:border-[#2B6BF3]" style={{ borderColor: LINE }}>
                      <span><span className="block font-semibold">{t}</span><span className="text-sm" style={{ color: MUTED }}>{d}</span></span>
                      <span style={{ color: BLUE }}>↗</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="IELTS Listening және Reading: дұрыс жауап → band" note="40 сұраққа шаққанда шамамен. Beles mock тесттері осы кесте бойынша бағаланады.">
          <table className="w-full max-w-md text-sm">
            <thead><tr className="text-left" style={{ color: MUTED }}><th className="py-1 font-medium">Listening</th><th className="font-medium">Academic Reading</th><th className="font-medium">Band</th></tr></thead>
            <tbody>{BANDS.map(([l, r, b]) => <tr key={b} className="border-t" style={{ borderColor: LINE }}><td className="py-1.5">{l}</td><td>{r}</td><td className="font-bold">{b}</td></tr>)}</tbody>
          </table>
        </Section>

        <Section title="IELTS Writing және Speaking қалай бағаланады">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="Writing · 4 критерий" items={['Task Achievement / Response — тапсырманы толық орындау', 'Coherence & Cohesion — логикалық құрылым, байланыстырғыш сөздер', 'Lexical Resource — сөздік қор, дәлдік', 'Grammatical Range & Accuracy — грамматиканың әртүрлілігі мен дұрыстығы']} />
            <Card title="Speaking · 4 критерий" items={['Fluency & Coherence — еркін әрі түсінікті сөйлеу', 'Lexical Resource — сөздік қор', 'Grammatical Range & Accuracy — грамматика', 'Pronunciation — айтылым']} />
          </div>
        </Section>

        <Section title="Beles кеңестері">
          <div className="grid gap-4 sm:grid-cols-2">{TIPS.map(([t, items]) => <Card key={t} title={t} items={items} />)}</div>
        </Section>

        <Section title="Пайдалы тіркестер">
          <div className="grid gap-4 sm:grid-cols-3">{PHRASES.map(([t, items]) => <Card key={t} title={t} items={items} english />)}</div>
        </Section>

        <div className="rounded-2xl p-5 text-white" style={{ background: INK }}>
          <div className="text-lg font-bold">Өзіңізді тексеріп көріңіз</div>
          <p className="mt-1 text-sm opacity-80">Beles Academic Mock — нақты емтихан форматындағы толық тесттер: таймер, бір рет ойнайтын аудио, автоматты бағалау.</p>
          <Link href="/ielts" className="mt-3 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold" style={{ color: INK }}>Mock тестке кіру</Link>
        </div>
      </div>
    </main>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-white p-5" style={{ borderColor: LINE }}>
      <h2 className="text-lg font-bold">{title}</h2>
      {note && <p className="mt-1 text-sm" style={{ color: MUTED }}>{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Card({ title, items, english }: { title: string; items: string[]; english?: boolean }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: LINE, background: '#FAFBFD' }}>
      <h3 className="font-bold">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.map((x) => <li key={x} className="flex gap-2"><span style={{ color: BLUE }}>•</span><span className={english ? 'italic' : ''}>{x}</span></li>)}
      </ul>
    </div>
  )
}
