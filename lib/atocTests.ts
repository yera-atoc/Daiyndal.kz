// AtoC ағылшын тілі тесттері (Belgibayev Yernar, 2026): A1–A2 сөздік және Workbook A1 аудармалары.
// Әр тестте 30 сұрақ, 4 нұсқа. Сұрақтар AtoC кітаптарынан алынған: Vocabulary A1/A2 және Workbook A1.
// kind: 'en' — ағылшын сөзі → аудармасы; 'tr' — аударма → ағылшын сөзі; 'wb' — сөйлем → ағылшынша аудармасы.
// Аудармалар [ru, kz] жұбы ретінде сақталады; 'en' сұрағының нұсқалары да [ru, kz].

export type Pair = [string, string]
export type AtocQuestion =
  | { kind: 'en'; lvl: 'A1' | 'A2'; q: string; opts: Pair[]; a: number }
  | { kind: 'tr'; lvl: 'A1' | 'A2'; q: Pair; opts: string[]; a: number }
  | { kind: 'wb'; topic: string; q: Pair; opts: string[]; a: number }
export type AtocTest = { id: 'vocab' | 'workbook'; title: string; about: Pair; questions: AtocQuestion[] }

export const ATOC_TESTS: AtocTest[] = [
  {
    id: 'vocab',
    title: 'Vocabulary A1–A2',
    about: ['Слова из книг AtoC Vocabulary A1 и A2', 'AtoC Vocabulary A1 және A2 кітаптарындағы сөздер'],
    questions: [
      { kind: 'en', lvl: "A1", q: "sing", opts: [["смотреть", "қарау"], ["слушать", "тыңдау"], ["петь", "ән айту"], ["рисовать", "сурет салу"]], a: 2 },
      { kind: 'tr', lvl: "A1", q: ["хотеть", "қалау"], opts: ["want", "cook", "eat", "drink"], a: 0 },
      { kind: 'en', lvl: "A1", q: "boots", opts: [["шарф", "шарф"], ["носки", "шұлық"], ["ботинки, сапоги", "етік"], ["перчатки", "қолғап"]], a: 2 },
      { kind: 'tr', lvl: "A1", q: ["быстрый", "жылдам"], opts: ["crowded", "slow", "fast", "expensive"], a: 2 },
      { kind: 'en', lvl: "A1", q: "clean", opts: [["грязный", "лас"], ["тёплый", "жылы"], ["чистый", "таза"], ["холодный", "суық"]], a: 2 },
      { kind: 'tr', lvl: "A1", q: ["слышать", "есту"], opts: ["hear", "see", "rest", "feel"], a: 0 },
      { kind: 'en', lvl: "A1", q: "juice", opts: [["вода", "су"], ["кофе", "кофе"], ["сок", "шырын"], ["чай", "шай"]], a: 2 },
      { kind: 'tr', lvl: "A1", q: ["городок", "қала"], opts: ["market", "town", "hospital", "map"], a: 1 },
      { kind: 'en', lvl: "A1", q: "red", opts: [["розовый", "қызғылт"], ["красный", "қызыл"], ["оранжевый", "қызғылт сары"], ["зелёный", "жасыл"]], a: 1 },
      { kind: 'tr', lvl: "A1", q: ["сладкий", "тәтті"], opts: ["sweet", "hot", "hungry", "thirsty"], a: 0 },
      { kind: 'en', lvl: "A1", q: "go", opts: [["находить", "табу"], ["переходить", "өту"], ["идти, ехать", "бару"], ["посещать", "барып қайту"]], a: 2 },
      { kind: 'tr', lvl: "A1", q: ["пытаться", "тырысу"], opts: ["give", "think", "make", "try"], a: 3 },
      { kind: 'en', lvl: "A1", q: "call", opts: [["любить", "жақсы көру"], ["помогать", "көмектесу"], ["звонить, звать", "қоңырау шалу"], ["знать", "білу"]], a: 2 },
      { kind: 'tr', lvl: "A1", q: ["поездка", "сапар"], opts: ["ticket", "trip", "passport", "boat"], a: 1 },
      { kind: 'en', lvl: "A1", q: "count", opts: [["начинать", "бастау"], ["ждать", "күту"], ["считать", "санау"], ["заканчивать", "аяқтау"]], a: 2 },
      { kind: 'en', lvl: "A2", q: "online", opts: [["беспроводной", "сымсыз"], ["медленный", "баяу"], ["онлайн", "онлайн"], ["цифровой", "цифрлық"]], a: 2 },
      { kind: 'tr', lvl: "A2", q: ["уходить на пенсию", "зейнеткерлікке шығу"], opts: ["serve", "retire", "earn", "repair"], a: 1 },
      { kind: 'en', lvl: "A2", q: "creative", opts: [["захватывающий", "қызықты, толқытатын"], ["творческий", "шығармашыл"], ["любимый", "сүйікті"], ["популярный", "танымал"]], a: 1 },
      { kind: 'tr', lvl: "A2", q: ["сердитый", "ашулы"], opts: ["angry", "nervous", "sad", "happy"], a: 0 },
      { kind: 'en', lvl: "A2", q: "near", opts: [["близкий", "жақын"], ["далёкий", "алыс"], ["тихий", "тыныш"], ["оживлённый", "жүргіншілер көп"]], a: 0 },
      { kind: 'tr', lvl: "A2", q: ["зубная щётка", "тіс щеткасы"], opts: ["toothbrush", "bus stop", "schedule", "bedroom"], a: 0 },
      { kind: 'en', lvl: "A2", q: "part-time", opts: [["трудолюбивый", "еңбекқор"], ["на неполный день", "толық емес жұмыс күні"], ["опытный", "тәжірибелі"], ["ответственный", "жауапты"]], a: 1 },
      { kind: 'tr', lvl: "A2", q: ["находить", "табу"], opts: ["cross", "go straight", "find", "ask"], a: 2 },
      { kind: 'en', lvl: "A2", q: "practise", opts: [["тренироваться", "жаттығу"], ["танцевать", "билеу"], ["вступать, присоединяться", "қосылу"], ["рисовать", "сурет салу"]], a: 0 },
      { kind: 'tr', lvl: "A2", q: ["пароль", "құпия сөз"], opts: ["charger", "screen", "password", "computer"], a: 2 },
      { kind: 'en', lvl: "A2", q: "exam", opts: [["экзамен", "емтихан"], ["проект", "жоба"], ["предмет", "пән"], ["оценка", "баға"]], a: 0 },
      { kind: 'tr', lvl: "A2", q: ["кислый", "қышқыл"], opts: ["sweet", "spicy", "sour", "delicious"], a: 2 },
      { kind: 'en', lvl: "A2", q: "back", opts: [["простуда, насморк", "суық тию, тұмау"], ["кашель", "жөтел"], ["спина", "арқа"], ["живот, желудок", "асқазан, іш"]], a: 2 },
      { kind: 'tr', lvl: "A2", q: ["сонный", "ұйқышыл"], opts: ["late", "sleepy", "busy", "early"], a: 1 },
      { kind: 'en', lvl: "A2", q: "break", opts: [["ломать", "сындыру"], ["отдыхать", "демалу"], ["кашлять", "жөтелу"], ["чувствовать себя", "сезіну"]], a: 0 },
    ],
  },
  {
    id: 'workbook',
    title: 'Workbook A1',
    about: ['Переводы из книги Workbook A1: 12 тем', 'Workbook A1 кітабындағы аудармалар: 12 тақырып'],
    questions: [
      { kind: 'wb', topic: "To be: am / is / are", q: ["Мне тоже десять лет.", "Мен де он жастамын."], opts: ["Me am ten years old too.", "I am ten years old too.", "I are ten years old too.", "I is ten years old too."], a: 1 },
      { kind: 'wb', topic: "To be: am / is / are", q: ["Я счастлив.", "Мен бақыттымын."], opts: ["I is happy.", "Me am happy.", "I are happy.", "I am happy."], a: 3 },
      { kind: 'wb', topic: "To be: am / is / are", q: ["Он не дома.", "Ол үйде емес."], opts: ["He is not at home.", "He are not at home.", "He be not at home.", "He is not on home."], a: 0 },
      { kind: 'wb', topic: "Articles: a / an / the", q: ["У меня есть кошка. Кошка белая.", "Менде мысық бар. Мысық ақ."], opts: ["I have an cat. The cat is white.", "I has a cat. The cat is white.", "I have a cat. The cat are white.", "I have a cat. The cat is white."], a: 3 },
      { kind: 'wb', topic: "Articles: a / an / the", q: ["Это книга.", "Бұл кітап."], opts: ["It are a book.", "It be a book.", "It is an book.", "It is a book."], a: 3 },
      { kind: 'wb', topic: "Plural nouns · this / that", q: ["Эти цветы красивые, а вон тот цветок жёлтый.", "Мына гүлдер әдемі, ал анау гүл сары."], opts: ["These flowers are beautiful, and those flower is yellow.", "These flowers are beautiful, and that flower is yellow.", "These flowers are beautiful, and that flower are yellow.", "These flowers is beautiful, and that flower is yellow."], a: 1 },
      { kind: 'wb', topic: "Plural nouns · this / that", q: ["Женщины в парке.", "Әйелдер саябақта."], opts: ["The women are in the park.", "The women are on the park.", "The women be in the park.", "The women is in the park."], a: 0 },
      { kind: 'wb', topic: "Have got", q: ["У меня нет телефона.", "Менің телефоным жоқ."], opts: ["I haven't got a phone.", "I hasn't got a phone.", "I haven't got an phone.", "I haven't get a phone."], a: 0 },
      { kind: 'wb', topic: "Have got", q: ["У него есть велосипед.", "Оның велосипеді бар."], opts: ["He has got a bike.", "He has got an bike.", "He has get a bike.", "He have got a bike."], a: 0 },
      { kind: 'wb', topic: "Have got", q: ["У неё есть друг.", "Оның досы бар."], opts: ["She has get a friend.", "She have got a friend.", "She has got a friend.", "She has got an friend."], a: 2 },
      { kind: 'wb', topic: "Present Simple", q: ["Она работает в банке?", "Ол банкте жұмыс істей ме?"], opts: ["Does she work in an bank?", "Do she work in a bank?", "Does she work in a bank?", "Does she work on a bank?"], a: 2 },
      { kind: 'wb', topic: "Present Simple", q: ["Она живёт в городе.", "Ол қалада тұрады."], opts: ["She live in a city.", "She lives on a city.", "She lives in an city.", "She lives in a city."], a: 3 },
      { kind: 'wb', topic: "Present Simple", q: ["Я встаю в семь часов.", "Мен сағат жетіде тұрамын."], opts: ["I get up on seven o'clock.", "Me get up at seven o'clock.", "I get up at seven o'clock.", "I get up at seven hours."], a: 2 },
      { kind: 'wb', topic: "Can / can't", q: ["Она умеет петь.", "Ол ән сала алады."], opts: ["She is can sing.", "She can to sing.", "She can sing.", "She cans sing."], a: 2 },
      { kind: 'wb', topic: "Can / can't", q: ["Я умею читать и писать.", "Мен оқи да, жаза да аламын."], opts: ["I can to read and write.", "I cans read and write.", "I can read and write.", "I is can read and write."], a: 2 },
      { kind: 'wb', topic: "Can / can't", q: ["Мы можем пойти в парк.", "Біз саябаққа бара аламыз."], opts: ["We is can go to the park.", "We can go to the park.", "We can to go to the park.", "We cans go to the park."], a: 1 },
      { kind: 'wb', topic: "There is / There are", q: ["Сколько окон в комнате?", "Бөлмеде неше терезе бар?"], opts: ["How many windows are there in the room?", "How many windows is there in the room?", "How much windows are there in the room?", "How many windows are there on the room?"], a: 0 },
      { kind: 'wb', topic: "There is / There are", q: ["В сумке есть книги.", "Сөмкеде кітаптар бар."], opts: ["There is books in the bag.", "There are books on the bag.", "It are books in the bag.", "There are books in the bag."], a: 3 },
      { kind: 'wb', topic: "Prepositions of place", q: ["Окно слева от двери.", "Терезе есіктің сол жағында."], opts: ["The window is in the left of the door.", "The window is on the left of the door.", "The window be on the left of the door.", "The window are on the left of the door."], a: 1 },
      { kind: 'wb', topic: "Prepositions of place", q: ["Банк рядом с магазином.", "Банк дүкеннің қасында."], opts: ["The bank is next to the shop.", "The bank are next to the shop.", "The bank is opposite the shop.", "The bank be next to the shop."], a: 0 },
      { kind: 'wb', topic: "Prepositions of place", q: ["Сад за домом.", "Бақ үйдің артында."], opts: ["The garden is in front of the house.", "The garden is behind the house.", "The garden be behind the house.", "The garden are behind the house."], a: 1 },
      { kind: 'wb', topic: "Possessives", q: ["Это его собака.", "Бұл оның иті."], opts: ["This are his dog.", "This be his dog.", "This is he dog.", "This is his dog."], a: 3 },
      { kind: 'wb', topic: "Possessives", q: ["Это её сумка.", "Бұл оның сөмкесі."], opts: ["This are her bag.", "This is she bag.", "This be her bag.", "This is her bag."], a: 3 },
      { kind: 'wb', topic: "Question words", q: ["Когда твой день рождения?", "Сенің туған күнің қашан?"], opts: ["When are your birthday?", "When is your birthday?", "When is you birthday?", "Where is your birthday?"], a: 1 },
      { kind: 'wb', topic: "Question words", q: ["Который час?", "Сағат неше?"], opts: ["What time be it?", "What time is it?", "Who time is it?", "What time are it?"], a: 1 },
      { kind: 'wb', topic: "Question words", q: ["Почему он дома?", "Ол неге үйде?"], opts: ["Why be he at home?", "Why is he on home?", "Why are he at home?", "Why is he at home?"], a: 3 },
      { kind: 'wb', topic: "Daily routine · time", q: ["Я просыпаюсь в шесть часов.", "Мен сағат алтыда оянамын."], opts: ["Me wake up at six o'clock.", "I wake up at six hours.", "I wake up at six o'clock.", "I wake up on six o'clock."], a: 2 },
      { kind: 'wb', topic: "Daily routine · time", q: ["Сейчас двенадцать часов.", "Қазір сағат он екі."], opts: ["It is twelve o'clock.", "It be twelve o'clock.", "It are twelve o'clock.", "It is twelve hours."], a: 0 },
      { kind: 'wb', topic: "Food · some / any", q: ["У меня есть немного хлеба.", "Менде аздап нан бар."], opts: ["I have any bread.", "I have some bread.", "Me have some bread.", "I has some bread."], a: 1 },
      { kind: 'wb', topic: "Food · some / any", q: ["Можно воды, пожалуйста?", "Су беріңізші, өтінемін."], opts: ["Can I have some water, please?", "Can I has some water, please?", "Can I have any water, please?", "Do I have some water, please?"], a: 0 },
    ],
  },
]

export const atocTest = (id: string) => ATOC_TESTS.find((t) => t.id === id)

// Дұрыс жауап саны және қате кеткен сұрақтардың нөмірлері (1-ден басталады). Жауапсыз сұрақ — қате.
export function gradeAtoc(t: AtocTest, answers: (number | null | undefined)[]) {
  const wrong: number[] = []
  t.questions.forEach((q, i) => { if (answers[i] !== q.a) wrong.push(i + 1) })
  const total = t.questions.length
  const correct = total - wrong.length
  return { correct, total, pct: Math.round((correct / total) * 100), wrong }
}
