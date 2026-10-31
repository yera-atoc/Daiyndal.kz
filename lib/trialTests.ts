// Тегін сынақ (деңгейді анықтау): сайтқа кірген кез келген адамға. Кілт тек серверде тексеріледі.
export type TrialQuestion = { text: string; options: string[]; answer: string; topic: string }
export type TrialTrack = {
  id: string
  title: string
  who: string
  minutes: number
  questions: TrialQuestion[]
  levels: { min: number; name: string; text: string }[] // min — дұрыс жауап саны (өсу ретімен)
}

export const TRIAL_TRACKS: TrialTrack[] = [
  {
    id: 'nzm',
    title: 'НЗМ · БИЛ · РФМШ',
    who: '4–6 сынып оқушылары',
    minutes: 20,
    questions: [
      { text: '125 · 8 − 999 =', options: ['1', '11', '101', '0'], answer: 'A', topic: 'Амалдар' },
      { text: 'Сыныпта 28 оқушы, олардың 3/7 бөлігі — ұлдар. Қыздар неше?', options: ['12', '16', '14', '21'], answer: 'B', topic: 'Бөлшек' },
      { text: '1, 4, 9, 16, 25, … тізбегінің келесі мүшесі:', options: ['30', '35', '36', '49'], answer: 'C', topic: 'Заңдылық' },
      { text: 'Тіктөртбұрыштың ұзындығы 9 см, периметрі 26 см. Ауданы:', options: ['36 см²', '117 см²', '28 см²', '72 см²'], answer: 'A', topic: 'Геометрия' },
      { text: 'Бағасы 4000 теңге кітапқа 15% жеңілдік берілді. Жаңа бағасы:', options: ['3600 тг', '3400 тг', '3850 тг', '3000 тг'], answer: 'B', topic: 'Пайыз' },
      { text: 'Автобус 3 сағатта 210 км жүрді. Осы жылдамдықпен 5 сағатта неше км жүреді?', options: ['280 км', '420 км', '350 км', '300 км'], answer: 'C', topic: 'Қозғалыс' },
      { text: 'A бағаны: 2/3. B бағаны: 0,6. Қайсысы үлкен?', options: ['A үлкен', 'B үлкен', 'Тең', 'Анықтау мүмкін емес'], answer: 'A', topic: 'Сандық сипаттама' },
      { text: 'Әке ұлынан 4 есе үлкен, екеуінің жасының қосындысы 50. Ұлы неше жаста?', options: ['12', '10', '8', '15'], answer: 'B', topic: 'Теңдеу құру' },
      { text: 'Сөмкеде 3 қызыл, 4 жасыл, 5 сары қалам бар. Көзді жұмып ең аз неше қалам алғанда, міндетті түрде бір жасыл қалам болады?', options: ['5', '4', '9', '12'], answer: 'C', topic: 'Логика' },
      { text: '−8 + 5 − (−3) · 2 =', options: ['3', '−9', '−6', '9'], answer: 'A', topic: 'Рационал сандар' },
      { text: 'Кубтың бір жағының ауданы 16 см². Кубтың көлемі:', options: ['96 см³', '64 см³', '48 см³', '256 см³'], answer: 'B', topic: 'Кеңістіктік ойлау' },
      { text: 'Үш таңбалы сан 5-ке және 9-ға бөлінеді, цифрлары әр түрлі, ең кішісі қандай?', options: ['180', '225', '105', '135'], answer: 'D', topic: 'Бөлінгіштік' },
    ],
    levels: [
      { min: 0, name: 'Бастапқы деңгей', text: 'Негізгі амалдар мен мәтінді есептерді нығайтудан бастау керек. НЗМ-ге 1–2 жыл жүйелі дайындық ұсынамыз: 5 сыныптан бастаған тиімді.' },
      { min: 5, name: 'Орта деңгей', text: 'Негіз бар, бірақ пайыз, логика және сандық сипаттама тапсырмаларында қателер бар. Топтық сабақ пен ай сайынғы Білім тексеру сынағы нәтижені тез көтереді.' },
      { min: 9, name: 'Жоғары деңгей', text: 'Жақсы нәтиже! Енді НЗМ форматындағы күрделі есептер мен уақытпен жұмыс істеуге көшу керек. Күшті топқа ұсынамыз.' },
    ],
  },
  {
    id: 'ubt',
    title: 'ҰБТ: математика',
    who: '9–11 сынып оқушылары',
    minutes: 25,
    questions: [
      { text: '(2³)² : 2⁴ =', options: ['4', '2', '8', '16'], answer: 'A', topic: 'Дәреже' },
      { text: '3x − 7 = 2x + 5 теңдеуінің түбірі:', options: ['−2', '12', '2', '−12'], answer: 'B', topic: 'Сызықтық теңдеу' },
      { text: 'x² − 7x + 10 = 0 теңдеуінің түбірлерінің көбейтіндісі:', options: ['7', '−10', '10', '−7'], answer: 'C', topic: 'Квадрат теңдеу' },
      { text: '√50 − √18 =', options: ['2√2', '√32', '4', '8√2'], answer: 'A', topic: 'Түбір' },
      { text: 'log₅ 125 =', options: ['25', '3', '5', '1/3'], answer: 'B', topic: 'Логарифм' },
      { text: 'sin 30° + cos 60° =', options: ['√3', '1/2', '1', '√2'], answer: 'C', topic: 'Тригонометрия' },
      { text: 'Арифметикалық прогрессия: 5, 9, 13, … 15-мүшесі:', options: ['61', '65', '57', '60'], answer: 'A', topic: 'Прогрессия' },
      { text: '2x − 3 > 5 теңсіздігінің шешімі:', options: ['x > 1', 'x > 4', 'x < 4', 'x > −4'], answer: 'B', topic: 'Теңсіздік' },
      { text: 'f(x) = x³ − 2x функциясының туындысы f\'(1) =', options: ['−1', '3', '1', '0'], answer: 'C', topic: 'Туынды' },
      { text: 'Тікбұрышты үшбұрыштың катеттері 5 және 12. Гипотенузасы:', options: ['13', '17', '√119', '60'], answer: 'A', topic: 'Геометрия' },
      { text: 'Екі ойын сүйегін лақтырғанда ұпайлар қосындысы 7 болу ықтималдығы:', options: ['1/36', '1/6', '7/36', '1/12'], answer: 'B', topic: 'Ықтималдық' },
      { text: '9ˣ − 4 · 3ˣ + 3 = 0 теңдеуінің түбірлерінің қосындысы:', options: ['3', '4', '0', '1'], answer: 'D', topic: 'Көрсеткіштік теңдеу' },
    ],
    levels: [
      { min: 0, name: 'Бастапқы деңгей', text: 'Мектеп бағдарламасының негізгі тақырыптарын (дәреже, теңдеу, функция) қайталаудан бастау керек. ҰБТ-ға кемінде бір жыл жүйелі дайындық ұсынамыз.' },
      { min: 5, name: 'Орта деңгей', text: 'Негіз бар, бірақ логарифм, тригонометрия және туынды тақырыптарында олқылықтар бар. ҰБТ форматындағы ай сайынғы сынақтар нәтижені тұрақтандырады.' },
      { min: 9, name: 'Жоғары деңгей', text: 'Күшті нәтиже! Енді ҰБТ-ның C деңгейлі тапсырмалары мен уақыт басқаруға назар аудару керек — 140 балдық толық сынақпен жаттығыңыз.' },
    ],
  },
  {
    id: 'english',
    title: 'Ағылшын тілі',
    who: '3–11 сынып оқушылары',
    minutes: 15,
    questions: [
      { text: 'My sister ___ a teacher.', options: ['is', 'are', 'am', 'be'], answer: 'A', topic: 'To be' },
      { text: 'They ___ football every Sunday.', options: ['plays', 'play', 'playing', 'is play'], answer: 'B', topic: 'Present Simple' },
      { text: 'Look! The children ___ in the garden.', options: ['play', 'plays', 'are playing', 'played'], answer: 'C', topic: 'Present Continuous' },
      { text: 'We ___ to the cinema yesterday.', options: ['went', 'go', 'gone', 'goes'], answer: 'A', topic: 'Past Simple' },
      { text: 'Choose the opposite of “cheap”.', options: ['small', 'expensive', 'easy', 'old'], answer: 'B', topic: 'Vocabulary' },
      { text: 'There aren\'t ___ apples in the fridge.', options: ['some', 'no', 'any', 'a'], answer: 'C', topic: 'Quantifiers' },
      { text: 'This book is ___ than that one.', options: ['more interesting', 'interestinger', 'most interesting', 'the more interesting'], answer: 'A', topic: 'Comparatives' },
      { text: 'I have lived here ___ 2019.', options: ['for', 'since', 'from', 'at'], answer: 'B', topic: 'Present Perfect' },
      { text: 'If it rains tomorrow, we ___ at home.', options: ['stay', 'stayed', 'will stay', 'would stay'], answer: 'C', topic: 'Conditionals' },
      { text: 'The letter ___ by my grandfather in 1990.', options: ['was written', 'wrote', 'is writing', 'has written'], answer: 'A', topic: 'Passive voice' },
      { text: 'Aigerim said that she ___ tired.', options: ['is being', 'was', 'were', 'be'], answer: 'B', topic: 'Reported speech' },
      { text: '“Despite” is closest in meaning to …', options: ['because of', 'so that', 'instead of', 'in spite of'], answer: 'D', topic: 'Vocabulary B1' },
    ],
    levels: [
      { min: 0, name: 'A1 · Starter', text: 'Ағылшын тілін негізден — сөздік қор, to be, Present Simple — бастау керек. Жас ерекшелігіне сай Starter / A1 тобына ұсынамыз.' },
      { min: 5, name: 'A2 · Elementary', text: 'Негізгі грамматика бар. Шақтарды (Past, Perfect) және оқылым дағдысын дамыту керек — A2–B1 тобына ұсынамыз.' },
      { min: 9, name: 'B1 · Intermediate', text: 'Жақсы деңгей! IELTS / Pre-IELTS тобы немесе B1–B2 бағдарламасы сізге сай келеді.' },
    ],
  },
]

export const trialTrack = (id: string) => TRIAL_TRACKS.find((t) => t.id === id) ?? null

export function trialLevel(t: TrialTrack, correct: number) {
  return [...t.levels].reverse().find((l) => correct >= l.min) ?? t.levels[0]
}

/** Телефонды тазалау: +7XXXXXXXXXX (Қазақстан), жарамсыз болса — null */
export function normPhone(raw: string): string | null {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1)
  if (d.length === 10) d = '7' + d
  return /^7\d{10}$/.test(d) ? '+' + d : null
}
