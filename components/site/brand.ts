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
  instagram: 'https://www.instagram.com/beles.education/',
  instagramHandle: '@beles.education',
}

export const waLink = (text = 'Сәлеметсіз бе! Beles education орталығы туралы білгім келеді.') =>
  `https://wa.me/${CONTACT.wa}?text=${encodeURIComponent(text)}`
