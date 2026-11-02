// Пән атауы ағылшын тіліне жата ма (клиентте де, серверде де қолдануға болады).
export function isEnglishSubject(subject: string | null | undefined): boolean {
  if (!subject) return false
  return /ағылшын|агылшын|english|англ/i.test(subject)
}
