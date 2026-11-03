// Қағаз журналдардан (2026 жылғы қараша) көшірілген топтар мен оқушылар — «Оқушыларды енгізу» бетінің бастапқы тізімі.
// Қолжазбадан нақты оқылмаған аттардың соңында «?» тұр — енгізер алдында тексеріп түзету керек.
// Күндер: 1 = дүйсенбі … 7 = жексенбі.

export type SeedLesson = { days: number[]; start: string; end: string; subject: string }
export type SeedStudent = { name: string; note?: string }
export type SeedGroup = { key: string; name: string; grade: number | null; teacherHint: string; lessons: SeedLesson[]; students: SeedStudent[]; note?: string }

const MWF = [1, 3, 5]
const TTS = [2, 4, 6]

export const IMPORT_SEED: SeedGroup[] = [
  {
    key: 'inf-11',
    name: 'Информатика 11-сынып',
    grade: 11,
    teacherHint: '',
    lessons: [
      { days: [2], start: '18:00', end: '19:00', subject: 'Информатика' },
      { days: [4], start: '19:00', end: '20:00', subject: 'Информатика' },
      { days: [6], start: '17:00', end: '18:00', subject: 'Информатика' },
    ],
    students: [{ name: 'Әмір' }, { name: 'Асан' }, { name: 'Нұржанат' }, { name: 'Алтынай?' }, { name: 'Иса' }, { name: 'Әділ?' }, { name: 'Әйгерім?' }],
  },
  {
    key: 'nzm-1',
    name: 'НЗМ 1-топ',
    grade: 6,
    teacherHint: 'Жолтай',
    note: 'Сабақ уақыты журналда жазылмаған — толтырыңыз',
    lessons: [{ days: [1, 3, 5, 6], start: '', end: '', subject: 'НЗМ дайындық' }],
    students: [
      { name: 'Інжу' }, { name: 'Аружан' }, { name: 'Жанель?' }, { name: 'Нұрасыл' }, { name: 'Алияр?' }, { name: 'Жанмұрат?' },
      { name: 'Зере' }, { name: 'Ерлан?' }, { name: 'Ұлжан?' }, { name: 'Айзада?' }, { name: 'Әлина?' }, { name: 'Батырхан' },
    ],
  },
  {
    key: 'nzm-2',
    name: 'НЗМ 2-топ',
    grade: 6,
    teacherHint: 'Жолтай',
    note: 'Сабақ уақыты журналда жазылмаған — толтырыңыз',
    lessons: [{ days: [1, 3, 5, 6], start: '', end: '', subject: 'НЗМ дайындық' }],
    students: [
      { name: 'Ақтамир?' }, { name: 'Шыңғыс?' }, { name: 'Ақжол?' }, { name: 'Дархан?' }, { name: 'Мұстафа' },
      { name: 'Бекназар' }, { name: 'Мұслим' }, { name: 'Ләйлім?' }, { name: 'Нұрасыл' },
    ],
  },
  {
    key: '5-1',
    name: '5-сынып 1-топ',
    grade: 5,
    teacherHint: 'Жолтай',
    note: 'Сабақ уақыты журналда жазылмаған — толтырыңыз',
    lessons: [{ days: MWF, start: '', end: '', subject: 'НЗМ дайындық' }],
    students: [
      { name: 'Әлихан' }, { name: 'Арсен' }, { name: 'Әмір' }, { name: 'Ертай?' }, { name: 'Мариям?' }, { name: 'Бекнұр' },
      { name: 'Айзере' }, { name: 'Бексұлтан' }, { name: 'Сани?' }, { name: 'Ернар' }, { name: 'Ибрагим' }, { name: 'Мирас' },
    ],
  },
  {
    key: '5-2-z',
    name: '5-сынып 2-топ (Жолтай)',
    grade: 5,
    teacherHint: 'Жолтай',
    lessons: [
      { days: [1, 3], start: '09:30', end: '10:30', subject: 'Жаратылыстану' },
      { days: [1, 3, 5], start: '10:30', end: '11:30', subject: 'Ағылшын тілі' },
      { days: [1, 3, 5], start: '11:30', end: '12:30', subject: 'Математика' },
    ],
    students: [
      { name: 'Әмірхан Ділмұхаммед?' }, { name: 'Ильмира Ержанқызы?' }, { name: 'Мұрат Әсемгүл?' }, { name: 'Бүркіт Нұрсұлтан?' },
      { name: 'Бақытбек Ернар?' }, { name: 'Бораныбай Батыр?' }, { name: 'Оразбек Айгерім?' }, { name: 'Ғалымжан Бексұлтан?' },
      { name: 'Нұрлан Мейіржан?' }, { name: 'М. Ернар?' }, { name: 'Сері Әлихан?' }, { name: 'Сарыбай Зейнеп?' }, { name: 'Нұрдәулет?' },
    ],
  },
  {
    key: '5-2-a',
    name: '5-сынып 2-топ (Айдос)',
    grade: 5,
    teacherHint: 'Айдос',
    note: 'Сабақ уақыты журналда жазылмаған — толтырыңыз',
    lessons: [{ days: TTS, start: '', end: '', subject: 'Математика' }],
    students: [{ name: 'Бекжан' }, { name: 'Айзере' }, { name: 'Айнара' }, { name: 'Айару' }],
  },
  {
    key: '5-shift2',
    name: '5-сынып (2-ауысым)',
    grade: 5,
    teacherHint: 'Айдос',
    lessons: [
      { days: TTS, start: '16:00', end: '17:00', subject: 'Математика' },
      { days: TTS, start: '17:00', end: '18:00', subject: 'Ағылшын тілі' },
    ],
    students: [
      { name: 'Амина', note: '+ ағылшын' }, { name: 'Әмір' }, { name: 'Нұрсұлтан?' }, { name: 'Әлихан' },
      { name: 'Асылан?', note: '+ ағылшын' }, { name: 'Айсұлтан' },
    ],
  },
  {
    key: '3',
    name: '3-сынып',
    grade: 3,
    teacherHint: 'Айдос',
    lessons: [
      { days: TTS, start: '10:30', end: '11:30', subject: 'Ағылшын тілі' },
      { days: TTS, start: '11:30', end: '12:30', subject: 'Математика' },
    ],
    students: [
      { name: 'Ибадулла Нұрмұхаммед' }, { name: 'Сәрсенбек Әмір' }, { name: 'Бағланбек Әлия?' }, { name: 'Қанатұлы Алияр' },
      { name: 'Жаңбырбай Айзере?' }, { name: 'Саматқызы Аяулым?' }, { name: 'Сұлтанмұратов Ақжол?' }, { name: 'Хасанов Әбілмансұр?' },
    ],
  },
  {
    key: '4-1',
    name: '4-сынып 1-топ',
    grade: 4,
    teacherHint: 'Айдос',
    lessons: [
      { days: TTS, start: '14:00', end: '15:00', subject: 'Математика' },
      { days: TTS, start: '15:00', end: '16:00', subject: 'Ағылшын тілі' },
    ],
    students: [
      { name: 'Ақмейір?' }, { name: 'Бекнұр' }, { name: 'Әлинұр?' }, { name: 'Нұржанат' }, { name: 'Әмірхан?' }, { name: 'Нұрхан' },
      { name: 'Айсұлтан', note: 'тек математика' }, { name: 'Раяна', note: 'тек математика' }, { name: 'Жансерік?' }, { name: 'Самир' },
    ],
  },
  {
    key: '4-2',
    name: '4-сынып 2-топ',
    grade: 4,
    teacherHint: 'Айдос',
    lessons: [
      { days: TTS, start: '14:00', end: '15:00', subject: 'Ағылшын тілі' },
      { days: TTS, start: '15:00', end: '16:00', subject: 'Математика' },
    ],
    students: [
      { name: 'Дамира' }, { name: 'Еркебұлан?' }, { name: 'Ақтамир' }, { name: 'Әлихан?' }, { name: 'Інжу' },
      { name: 'Ділназ' }, { name: 'Қанибек?' }, { name: 'Айдана?' }, { name: 'Мұхаммед' },
    ],
  },
  {
    key: '4-3',
    name: '4-сынып 3-топ',
    grade: 4,
    teacherHint: 'Айдос',
    lessons: [
      { days: [3, 5, 6], start: '11:30', end: '12:30', subject: 'Ағылшын тілі' },
      { days: [3, 5, 6], start: '12:30', end: '13:30', subject: 'Математика' },
    ],
    students: [
      { name: 'Жолдыбай Данияр?' }, { name: 'Ернұр?' }, { name: 'Берік Сарыжан?' }, { name: 'Болат Әбілқайыр' },
      { name: 'Мамбетов Бауыржан' }, { name: 'Әлібай Сәди?' },
    ],
  },
  {
    key: '7',
    name: '7-сынып',
    grade: 7,
    teacherHint: 'Айдос',
    lessons: [{ days: TTS, start: '08:30', end: '09:30', subject: 'Математика' }],
    students: [
      { name: 'Ісләмбаев Нұрәмір?' }, { name: 'Жантай Бибібала?' }, { name: 'Мандабай Зере' },
      { name: 'Байбол Бексұлтан' }, { name: 'Оразбай Кәусар' }, { name: 'Әріпбай Хадиса?' },
    ],
  },
  {
    key: '8',
    name: '8-сынып',
    grade: 8,
    teacherHint: '',
    note: 'Екі журнал (математика және ағылшын) бір топқа біріктірілді. Математика мұғалімін таңдаңыз.',
    lessons: [
      { days: MWF, start: '15:00', end: '16:00', subject: 'Математика' },
      { days: MWF, start: '16:00', end: '17:00', subject: 'Ағылшын тілі' },
    ],
    students: [
      { name: 'Батырханов Нұрсұлтан' }, { name: 'Мұрат Айзере' }, { name: 'Сабина' }, { name: 'Әмірсұлтан' },
      { name: 'Әмір Ақжол?', note: 'тек математика' }, { name: 'Қасқабай Керім?', note: 'тек математика' }, { name: 'Ақниет?', note: 'тек математика' },
      { name: 'Еркеназ?', note: 'тек математика' }, { name: 'Асылан?', note: 'тек математика' },
      { name: 'Ажар?', note: 'тек ағылшын' }, { name: 'Бекнұр?', note: 'тек ағылшын' }, { name: 'Нұрдәулет', note: 'тек ағылшын' },
    ],
  },
  {
    key: '9-11-eng',
    name: '9–11 сынып (ағылшын)',
    grade: 10,
    teacherHint: 'Ернар',
    note: 'Сабақ уақыты журналда жазылмаған — толтырыңыз',
    lessons: [{ days: MWF, start: '', end: '', subject: 'Ағылшын тілі' }],
    students: [
      { name: 'Оразбек Аружан' }, { name: 'Махамбетова Назым?' }, { name: 'Әмірбек Ақжан?' }, { name: 'Құлмағанбет Нұрдәулет?' }, { name: 'Берік' },
    ],
  },
  {
    key: '11-ubt-eng',
    name: '11-сынып ҰБТ (ағылшын)',
    grade: 11,
    teacherHint: 'Ернар',
    note: 'Сабақ уақыты журналда жазылмаған — толтырыңыз',
    lessons: [{ days: MWF, start: '', end: '', subject: 'Ағылшын тілі' }],
    students: [{ name: 'Айтжан?' }, { name: 'Камила' }, { name: 'Ұмит' }, { name: 'Жанболат?' }],
  },
  {
    key: '11-mat',
    name: '11-сынып математикалық сауаттылық',
    grade: 11,
    teacherHint: 'Айдос',
    lessons: [{ days: [2, 4], start: '17:00', end: '18:00', subject: 'Математикалық сауаттылық' }],
    students: [
      { name: 'Мағзұмова Сабина?' }, { name: 'Қанатбай Бейбарыс?' }, { name: 'Бөлен Камила?' }, { name: 'Мұрат Әлиман?' },
      { name: 'Айтбек Ақжол?' }, { name: 'Шуақбай Әлихан?' }, { name: 'Жансая' }, { name: 'Ерке' }, { name: 'Айда?' },
      { name: 'Айтжан?' }, { name: 'Нұрдана?' }, { name: 'Ұмит' }, { name: 'Камила' },
    ],
  },
]
