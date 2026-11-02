// Жезқазған ауа райы — Open-Meteo (тегін, кілтсіз). Жарты сағат кэштеледі.

export const ZHEZKAZGAN = { name: 'Жезқазған', lat: 47.7833, lon: 67.7144 }

export type DayWeather = { date: string; min: number; max: number; code: number; label: string; icon: string; rain: number | null; wind: number | null }
export type Weather = { city: string; now: { temp: number; code: number; label: string; icon: string; wind: number | null } | null; today: DayWeather | null; tomorrow: DayWeather | null }

/** WMO ауа райы коды → қазақша сипаттама */
export function wmo(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'ашық, күн шуақты', icon: '☀️' }
  if (code <= 2) return { label: 'аздап бұлтты', icon: '🌤️' }
  if (code === 3) return { label: 'бұлтты', icon: '☁️' }
  if (code === 45 || code === 48) return { label: 'тұман', icon: '🌫️' }
  if (code >= 51 && code <= 57) return { label: 'сіркіреген жаңбыр', icon: '🌦️' }
  if (code >= 61 && code <= 67) return { label: 'жаңбыр', icon: '🌧️' }
  if (code >= 71 && code <= 77) return { label: 'қар', icon: '🌨️' }
  if (code >= 80 && code <= 82) return { label: 'нөсер жаңбыр', icon: '🌧️' }
  if (code === 85 || code === 86) return { label: 'қатты қар', icon: '❄️' }
  if (code >= 95) return { label: 'найзағай', icon: '⛈️' }
  return { label: 'белгісіз', icon: '🌡️' }
}

export async function getWeather(): Promise<Weather | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${ZHEZKAZGAN.lat}&longitude=${ZHEZKAZGAN.lon}` +
    '&current=temperature_2m,weather_code,wind_speed_10m' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max' +
    '&timezone=Asia%2FAlmaty&forecast_days=2&wind_speed_unit=ms'
  try {
    const r = await fetch(url, { next: { revalidate: 1800 } })
    if (!r.ok) return null
    const d = await r.json()
    const day = (i: number): DayWeather | null => {
      if (!d.daily?.time?.[i]) return null
      const code = d.daily.weather_code[i]
      return {
        date: d.daily.time[i],
        min: Math.round(d.daily.temperature_2m_min[i]),
        max: Math.round(d.daily.temperature_2m_max[i]),
        code,
        ...wmo(code),
        rain: d.daily.precipitation_probability_max?.[i] ?? null,
        wind: d.daily.wind_speed_10m_max?.[i] != null ? Math.round(d.daily.wind_speed_10m_max[i]) : null,
      }
    }
    const now = d.current
      ? { temp: Math.round(d.current.temperature_2m), code: d.current.weather_code, ...wmo(d.current.weather_code), wind: d.current.wind_speed_10m != null ? Math.round(d.current.wind_speed_10m) : null }
      : null
    return { city: ZHEZKAZGAN.name, now, today: day(0), tomorrow: day(1) }
  } catch {
    return null
  }
}

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`)

/** Брифингке арналған бір-екі сөйлем */
export function weatherSentence(w: Weather | null): string {
  if (!w?.today) return ''
  const t = w.today
  const parts = [`Жезқазғанда бүгін ${t.label}, ${sign(t.min)}…${sign(t.max)}°C${w.now ? ` (қазір ${sign(w.now.temp)}°)` : ''}${t.rain && t.rain >= 40 ? `, жауын ықтималдығы ${t.rain}%` : ''}.`]
  if (w.tomorrow) parts.push(`Ертең ${w.tomorrow.label}, ${sign(w.tomorrow.min)}…${sign(w.tomorrow.max)}°C.`)
  return parts.join(' ')
}
