// Оқушы кіруі: аты-жөнін өзі жазады (тізім көрсетілмейді). Жазылуы әртүрлі болса да табу.
import { norm } from './studentMatch'

const tokens = (s: string) => norm(s).split(' ').filter(Boolean)

/**
 * Логин бойынша үміткерлер: алдымен толық сәйкес (сөз реті маңызды емес), болмаса — жазылған сөздердің бәрі
 * аты-жөнінде бар оқушылар («Ақжол» → «Айтбек Ақжол»). Ең көбі 5 үміткер — PIN солардың әрқайсысымен тексеріледі.
 */
export function loginCandidates<T extends { full_name: string }>(login: string, list: T[]): T[] {
  const want = tokens(login)
  if (!want.length || want.join('').length < 2) return []
  const key = [...want].sort().join(' ')
  const exact = list.filter((s) => [...tokens(s.full_name)].sort().join(' ') === key)
  if (exact.length) return exact.slice(0, 5)
  const partial = list.filter((s) => {
    const have = tokens(s.full_name)
    return want.every((w) => have.includes(w))
  })
  return partial.length <= 5 ? partial : []
}
