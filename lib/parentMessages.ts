// Ата-аналарға WhatsApp хабарламаларының мәтіні (клиентте құрастырылады).
import { money } from './payments'

const MONTHS = ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан']
const dmy = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`
const hello = (parent: string | null) => `Сәлеметсіз бе${parent ? `, ${parent}` : ''}!`

export type PayInfo = { deadline: string | null; amount: number | null; kind: string; days: number | null }
export type ResultInfo = { title: string; month: string; score: number; max: number; place: number | null; of: number; subjects: { name: string; score: number | null; max: number }[] }

export function paymentMessage(name: string, parent: string | null, p: PayInfo): string {
  const sum = p.amount ? ` ${money(p.amount)}` : ''
  if (p.kind === 'overdue' && p.deadline)
    return `${hello(parent)} Beles education оқу орталығынан жазып отырмыз. ${name} бойынша${sum} төлемнің мерзімі ${dmy(p.deadline)} күні өтіп кетті. Төлем жасауыңызды сұраймыз. Рахмет!`
  if (p.kind === 'today') return `${hello(parent)} Beles education: ${name} бойынша${sum} төлем күні — бүгін. Рахмет!`
  if (p.deadline) return `${hello(parent)} Beles education: ${name} бойынша келесі төлем — ${dmy(p.deadline)}${sum ? `,${sum}` : ''}. Рахмет!`
  return `${hello(parent)} Beles education оқу орталығынан жазып отырмыз. ${name} бойынша осы айдың төлемі туралы хабарлаймыз. Рахмет!`
}

export function resultMessage(name: string, parent: string | null, r: ResultInfo, site: string): string {
  const [y, m] = r.month.split('-').map(Number)
  const month = m ? `${MONTHS[m - 1]} айындағы` : ''
  const subj = r.subjects.filter((s) => s.score !== null).map((s) => `• ${s.name}: ${s.score}/${s.max}`).join('\n')
  return [
    `${hello(parent)} Beles education оқу орталығы.`,
    `${name} ${y ? `${y} жылғы ` : ''}${month} «${r.title}» сынағынан ${r.score}/${r.max} балл жинады${r.place ? `, топта ${r.place}-орын (${r.of} оқушының ішінде)` : ''}.`,
    subj ? `\n${subj}\n` : '',
    `Толық есеп пен қателер талдауы балаңыздың кабинетінде: ${site}/bilim-test`,
    'Сұрақтарыңыз болса, жазыңыз. Рахмет!',
  ]
    .filter(Boolean)
    .join('\n')
}

export function waUrl(phone: string | null, text: string): string | null {
  let d = (phone ?? '').replace(/\D/g, '')
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1)
  if (d.length === 10) d = '7' + d
  if (d.length !== 11) return null
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
}
