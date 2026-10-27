// Beles сайтының ортақ деректері: түстер, байланыс, бағдарламалар.
export const B = {
  ink: '#0B0F19',
  blue: '#2B6BF3',
  red: '#E5383B',
  paper: '#F5F7FB',
  line: '#E3E7F0',
  muted: '#6B7385',
}

export const CONTACT = {
  phone: '+7 (777) 273-92-48',
  wa: '77772739248',
  address: 'Жезқазған қ., Анарқұлова көшесі, 12',
  gis: 'https://go.2gis.com/SgduX',
  instagram: 'https://www.instagram.com/beleseducation/',
  instagramHandle: '@beleseducation',
}

export const waLink = (text = 'Сәлеметсіз бе! Beles education орталығы туралы білгім келеді.') =>
  `https://wa.me/${CONTACT.wa}?text=${encodeURIComponent(text)}`

// Мұғалімдер (басты беттегі «Мұғалімдер» бөлімі). Жаңа мұғалімді осы тізімге қосу жеткілікті.
export const TEACHERS: { name: string; subject: string }[] = [
  { name: 'Yernar Belgibayev', subject: 'Ағылшын тілі' },
  { name: 'Айдын Әбілқайыр', subject: 'Математика' },
  { name: 'Жолтай Қайрат', subject: 'Математика' },
  { name: 'Асан', subject: 'Физика' },
  { name: 'Ақниет Рамазанова', subject: 'Қазақ тілі' },
]
// Аты әлі қосылмаған, бірақ сабағы бар пәндер
export const MORE_SUBJECTS = ['Қазақстан тарихы', 'Дүниежүзі тарихы', 'Информатика', 'Химия', 'Орыс тілі']
