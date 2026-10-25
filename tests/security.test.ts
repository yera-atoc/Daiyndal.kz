import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: {} }))
import { RULES, lockedFor, maskName, maskNames, nextFail } from '@/lib/security'

describe('кіру әрекеттерін шектеу', () => {
  const t0 = Date.parse('2026-10-26T10:00:00Z')

  it('аккаунт: 5-ші қатеде 15 минутқа бұғаттайды', () => {
    let row = undefined as ReturnType<typeof nextFail> | undefined
    for (let i = 1; i < RULES.account.max; i++) {
      row = nextFail(row, 'teacher:aigul', t0 + i * 1000)
      expect(row.locked_until).toBeNull()
      expect(row.fails).toBe(i)
    }
    row = nextFail(row, 'teacher:aigul', t0 + 10_000)
    expect(row.locked_until).not.toBeNull()
    expect(lockedFor([row], t0 + 10_000)).toBe(RULES.account.lockMs)
    expect(lockedFor([row], t0 + 10_000 + RULES.account.lockMs + 1)).toBe(0)
  })

  it('IP: шекке дейін бұғаттамайды', () => {
    let row = undefined as ReturnType<typeof nextFail> | undefined
    for (let i = 1; i < RULES.ip.max; i++) row = nextFail(row, 'ip:1.2.3.4', t0 + i)
    expect(row!.locked_until).toBeNull()
    expect(nextFail(row, 'ip:1.2.3.4', t0 + 100).locked_until).not.toBeNull()
  })

  it('терезе өткен соң санауыш басынан басталады', () => {
    const row = nextFail(nextFail(undefined, 'admin:owner', t0), 'admin:owner', t0 + 1000)
    expect(row.fails).toBe(2)
    expect(nextFail(row, 'admin:owner', t0 + RULES.account.windowMs + 5000).fails).toBe(1)
  })
})

describe('аттарды жасыру', () => {
  it('тегін бас әрпіне қысқартады', () => {
    expect(maskName('Айтбек Азиз')).toBe('Айтбек А.')
    expect(maskName('  Дана   Сейітқызы  Ержанқызы ')).toBe('Дана С. Е.')
    expect(maskName('Әлихан')).toBe('Әлихан')
  })
  it('бір топта бірдей шықса, әріп қосады', () => {
    const out = maskNames([
      { name: 'Айтбек Азизов', group: 'A' },
      { name: 'Айтбек Алиев', group: 'A' },
      { name: 'Айтбек Азизов', group: 'B' },
    ])
    expect(out.map((x) => x.name)).toEqual(['Айтбек Аз.', 'Айтбек Ал.', 'Айтбек А.'])
  })
})
