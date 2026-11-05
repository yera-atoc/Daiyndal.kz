'use client'

// Браузердегі сөйлеуді тану (Web Speech API, ағылшынша). Chrome/Edge/Android/Safari 14.5+.
// Қолдамаса — null қайтарады; онда жазба бәрібір сақталады, ИИ серверде (Gemini) мәтінге айналдыруы мүмкін.
export type SpeechCtl = { stop: () => Promise<string>; text: () => string }

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
}

export function startSpeech(onText?: (t: string) => void): SpeechCtl | null {
  const SR = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null
  if (!SR) return null
  let finals: string[] = []
  let interim = ''
  let active = true
  let rec: any = null
  let done: (() => void) | null = null
  const full = () => [...finals, interim].join(' ').replace(/\s+/g, ' ').trim()

  const make = () => {
    const r = new SR()
    r.lang = 'en-US'
    r.continuous = true
    r.interimResults = true
    r.maxAlternatives = 1
    r.onresult = (e: any) => {
      interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0]?.transcript ?? ''
        if (e.results[i].isFinal) finals.push(t.trim())
        else interim += t
      }
      onText?.(full())
    }
    r.onerror = () => {}
    r.onend = () => {
      if (interim) {
        finals.push(interim.trim())
        interim = ''
      }
      if (active) {
        // Мобильді Chrome үзілістен кейін тоқтап қалады — қайта қосамыз
        try {
          rec = make()
          rec.start()
        } catch {}
      } else done?.()
    }
    return r
  }
  try {
    rec = make()
    rec.start()
  } catch {
    return null
  }
  return {
    text: full,
    stop: () =>
      new Promise<string>((resolve) => {
        active = false
        const finish = () => resolve(full())
        done = finish
        try {
          rec?.stop()
        } catch {
          finish()
        }
        setTimeout(finish, 1500) // onend келмесе
      }),
  }
}
