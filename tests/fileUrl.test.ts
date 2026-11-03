import { describe, expect, it } from 'vitest'
import { fileSrc, storagePath } from '@/lib/fileUrl'

describe('protected file urls', () => {
  it('rewrites Supabase public materials links to /api/files', () => {
    const u = 'https://abc.supabase.co/storage/v1/object/public/materials/bilim/2026-10/math%201.png'
    expect(storagePath(u)).toBe('bilim/2026-10/math 1.png')
    expect(fileSrc(u)).toBe('/api/files/bilim/2026-10/math%201.png')
  })
  it('leaves other links alone', () => {
    expect(fileSrc('/ielts-media/a.mp3')).toBe('/ielts-media/a.mp3')
    expect(fileSrc('https://example.com/x.png')).toBe('https://example.com/x.png')
    expect(fileSrc(null)).toBeNull()
    expect(storagePath('https://abc.supabase.co/storage/v1/object/public/other/x.png')).toBeNull()
  })
})
