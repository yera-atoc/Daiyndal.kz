// Күннің жағымды жаңалықтары: Claude интернеттен іздеп, Қазақстан мен әлемнен 3+3 жақсы жаңалық таңдайды.
// Нәтиже 3 сағатқа кэштеледі (Vercel data cache), сондықтан іздеу күніне бірнеше-ақ рет жүреді.
import { unstable_cache } from 'next/cache'
import { logServerError } from './serverLog'

export type NewsItem = { region: 'kz' | 'world'; title: string; summary: string; source: string; url: string }

const PROMPT = (today: string) => `Бүгін ${today}. Соңғы 1–2 күндегі ЖАҒЫМДЫ, шабыттандыратын жаңалықтарды интернеттен тап:
- 3 жаңалық Қазақстаннан (білім, ғылым, спорт жетістіктері, жаңа ашылулар, мәдениет, экономикадағы жақсы оқиғалар);
- 3 жаңалық әлемнен (ғылым, медицина, технология, табиғат, адамдардың игі істері).
Саясат, соғыс, апат, қылмыс, дау-дамай тақырыптарын АЛМА. Тек нақты, сенімді басылымдардағы жаңалық болсын, ойдан шығарма.
Жауаптың соңында ТЕК JSON массивін бер (басқа мәтінсіз):
[{"region":"kz"|"world","title":"қазақша қысқа тақырып","summary":"қазақша 1 сөйлем","source":"басылым атауы","url":"https://..."}]`

async function fetchGoodNews(today: string): Promise<NewsItem[]> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return []
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.ADMIN_CHAT_MODEL ?? 'claude-sonnet-5-5',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      messages: [{ role: 'user', content: PROMPT(today) }],
    }),
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const d = await r.json()
  const text = (d.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
  const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)
  const items = JSON.parse(json) as NewsItem[]
  return items
    .filter((n) => n && (n.region === 'kz' || n.region === 'world') && n.title && /^https?:\/\//.test(n.url))
    .slice(0, 8)
    .map((n) => ({ region: n.region, title: String(n.title).slice(0, 160), summary: String(n.summary ?? '').slice(0, 300), source: String(n.source ?? '').slice(0, 60), url: n.url }))
}

/** Кэштелген нұсқа. Қате болса — бос тізім (кэшке түспейді, келесі жолы қайта көреді). */
export async function getGoodNews(today: string): Promise<NewsItem[]> {
  const slot = Math.floor(new Date().getUTCHours() / 3) // 3 сағаттық терезе
  try {
    return await unstable_cache(() => fetchGoodNews(today), ['good-news', today, String(slot)], { revalidate: 3 * 3600 })()
  } catch (e) {
    await logServerError('good-news', e)
    return []
  }
}
