// Helpers for issuing teacher logins/passwords. Server-side only (used by
// app/api/teachers/credentials/route.ts).

// Kazakh + Russian -> Latin, so a subject like "Қазақ тілі" or "Математика"
// can become a login like "kazaktili1" / "matematika1".
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', ә: 'a', б: 'b', в: 'v', г: 'g', ғ: 'g', д: 'd', е: 'e', ё: 'yo',
  ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', қ: 'k', л: 'l', м: 'm', н: 'n',
  ң: 'n', о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ұ: 'u',
  ү: 'u', ф: 'f', х: 'h', һ: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh',
  ъ: '', ы: 'y', і: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export function transliterate(input: string): string {
  return Array.from(input.toLowerCase())
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join('')
}

/** Login prefix from a subject: "IELTS" -> "ielts", "Математика" -> "matematika". */
export function loginBase(subject: string | null | undefined): string {
  const latin = transliterate(subject ?? '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12)
  return latin || 'teacher'
}

// No look-alike characters (I, l, 1, O, o, 0) so passwords are easy to read
// off a screen or a printed sheet.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

/** Random password like "Kx7m-Qp3z-Rt9w" (12 characters, ~69 bits). */
export function generatePassword(groups = 3, size = 4): string {
  const total = groups * size
  const limit = 256 - (256 % ALPHABET.length) // rejection sampling: no modulo bias
  const chars: string[] = []

  while (chars.length < total) {
    const bytes = crypto.getRandomValues(new Uint8Array(total * 2))
    for (let i = 0; i < bytes.length && chars.length < total; i++) {
      const b = bytes[i]
      if (b < limit) chars.push(ALPHABET[b % ALPHABET.length])
    }
  }

  const chunks: string[] = []
  for (let i = 0; i < groups; i++) {
    chunks.push(chars.slice(i * size, (i + 1) * size).join(''))
  }
  return chunks.join('-')
}
