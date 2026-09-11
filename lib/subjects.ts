export type Accent = 'mustard' | 'coral' | 'sky'

export type Subject = {
  id: string
  name: string
  description: string
  accent: Accent
}

export const subjects: Subject[] = [
  {
    id: 'english',
    name: 'Ағылшын тілі',
    description: 'Reading, грамматика және сөздік қор',
    accent: 'sky',
  },
  {
    id: 'kazakh',
    name: 'Қазақ тілі',
    description: 'Грамматика, оқылым және шығармашылық жазба',
    accent: 'mustard',
  },
  {
    id: 'russian',
    name: 'Орыс тілі',
    description: 'Грамматика және мәтінді түсіну',
    accent: 'coral',
  },
  {
    id: 'math',
    name: 'Математика',
    description: 'Логика және есеп шығару',
    accent: 'sky',
  },
  {
    id: 'science',
    name: 'Жаратылыстану',
    description: 'Табиғат құбылыстары және тірі ағзалар',
    accent: 'mustard',
  },
  {
    id: 'digital',
    name: 'Сандық сауаттылық',
    description: 'Логикалық ойлау және сандық құзыреттілік',
    accent: 'coral',
  },
]
