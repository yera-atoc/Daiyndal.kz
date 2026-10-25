import { redirect } from 'next/navigation'

// Қысқа сілтеме: /toefl → оқушылардың mock тесттер беті
export default function ToeflShortLink() {
  redirect('/ielts')
}
