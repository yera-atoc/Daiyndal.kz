export type TestItem = {
  id: string
  subjectId: string
  grade: 5 | 6
  title: string
  week: string
  questionCount: number
  available: boolean
}

export const tests: TestItem[] = [
  {
    id: 't1',
    subjectId: 'english',
    grade: 5,
    title: 'Reading: қысқа мәтінді түсіну',
    week: '1-апта',
    questionCount: 12,
    available: true,
  },
  {
    id: 't2',
    subjectId: 'english',
    grade: 6,
    title: 'Grammar: Present/Past Simple',
    week: '1-апта',
    questionCount: 15,
    available: true,
  },
  {
    id: 't3',
    subjectId: 'english',
    grade: 6,
    title: 'Vocabulary: synonyms & antonyms',
    week: '2-апта',
    questionCount: 10,
    available: false,
  },
  {
    id: 't4',
    subjectId: 'kazakh',
    grade: 5,
    title: 'Грамматика: сөз таптары',
    week: '1-апта',
    questionCount: 14,
    available: true,
  },
  {
    id: 't5',
    subjectId: 'kazakh',
    grade: 6,
    title: 'Мәтінді түсіну және талдау',
    week: '2-апта',
    questionCount: 12,
    available: false,
  },
  {
    id: 't6',
    subjectId: 'russian',
    grade: 5,
    title: 'Грамматика: части речи',
    week: '1-апта',
    questionCount: 14,
    available: true,
  },
  {
    id: 't7',
    subjectId: 'russian',
    grade: 6,
    title: 'Понимание текста',
    week: '2-апта',
    questionCount: 12,
    available: false,
  },
  {
    id: 't8',
    subjectId: 'math',
    grade: 5,
    title: 'Логикалық есептер',
    week: '1-апта',
    questionCount: 16,
    available: true,
  },
  {
    id: 't9',
    subjectId: 'math',
    grade: 6,
    title: 'Бөлшектер және пропорция',
    week: '1-апта',
    questionCount: 18,
    available: true,
  },
  {
    id: 't10',
    subjectId: 'science',
    grade: 5,
    title: 'Табиғат құбылыстары',
    week: '1-апта',
    questionCount: 12,
    available: true,
  },
  {
    id: 't11',
    subjectId: 'science',
    grade: 6,
    title: 'Тірі ағзалар және орта',
    week: '2-апта',
    questionCount: 12,
    available: false,
  },
  {
    id: 't12',
    subjectId: 'digital',
    grade: 6,
    title: 'Сандық логика және заңдылықтар',
    week: '1-апта',
    questionCount: 10,
    available: true,
  },
]
