// Жүктелген файлдарға (тест суреттері, материалдар, аудио) тек кірген адамдар қол жеткізуі үшін:
// Supabase-тің ашық сілтемесі (…/storage/v1/object/public/materials/<жол>) → біздің /api/files/<жол>.
// Сервер сессияны тексеріп, 10 минуттық уақытша сілтеме береді. Басқа сілтемелерге тимейді.

const PUBLIC_RE = /^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/materials\/([^?#]+)/

export function storagePath(url: string | null | undefined): string | null {
  const m = url ? PUBLIC_RE.exec(url) : null
  return m ? decodeURIComponent(m[1]) : null
}

export function fileSrc<T extends string | null | undefined>(url: T): T | string {
  const p = storagePath(url)
  return p ? `/api/files/${p.split('/').map(encodeURIComponent).join('/')}` : url
}
