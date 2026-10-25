import { afterEach, describe, expect, it } from 'vitest'
import { signAdmin, verifyAdmin } from '@/lib/adminSession'
import { generateSalt, hashPasswordV2, hashTeacherPassword, verifyPassword } from '@/lib/teacherAuth'

describe('әкімші сессиясы', () => {
  afterEach(() => {
    process.env.ADMIN_PASSWORD = 'owner-pass-1'
  })
  process.env.ADMIN_PASSWORD = 'owner-pass-1'
  process.env.SESSION_SECRET = 'test-secret'

  it('иесі мен мұғалім-әкімшіні таниды', async () => {
    expect(await verifyAdmin(await signAdmin('owner'))).toEqual({ kind: 'owner' })
    expect(await verifyAdmin(await signAdmin('t-1b2c'))).toEqual({ kind: 'teacher', id: '1b2c' })
  })
  it('қолдан өзгертілген cookie өтпейді', async () => {
    const tok = await signAdmin('t-aaa')
    expect(await verifyAdmin(tok.replace('t-aaa', 't-bbb'))).toBeNull()
    expect(await verifyAdmin('owner')).toBeNull()
    expect(await verifyAdmin('')).toBeNull()
  })
  it('мерзімі өткен сессия өтпейді', async () => {
    const tok = await signAdmin('owner', Date.now() - 8 * 86_400_000)
    expect(await verifyAdmin(tok)).toBeNull()
  })
  it('иесі құпия сөзді ауыстырса, ескі сессиялар жабылады', async () => {
    const tok = await signAdmin('owner')
    process.env.ADMIN_PASSWORD = 'new-pass-2'
    expect(await verifyAdmin(tok)).toBeNull()
  })
})

describe('құпия сөз хэші', () => {
  it('v2 (PBKDF2) дұрыс тексеріледі', async () => {
    const salt = generateSalt()
    const h = await hashPasswordV2('Qwerty123', salt)
    expect(h.startsWith('pbkdf2$')).toBe(true)
    expect(await verifyPassword('Qwerty123', salt, h)).toEqual({ ok: true, rehash: false })
    expect((await verifyPassword('qwerty123', salt, h)).ok).toBe(false)
  })
  it('ескі sha256 хэш жұмыс істейді және жаңартуды сұрайды', async () => {
    const salt = generateSalt()
    const old = await hashTeacherPassword('Qwerty123', salt)
    expect(await verifyPassword('Qwerty123', salt, old)).toEqual({ ok: true, rehash: true })
    expect(await verifyPassword('wrong', salt, old)).toEqual({ ok: false, rehash: false })
  })
})
