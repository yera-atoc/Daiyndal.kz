import { afterEach, describe, expect, it, vi } from 'vitest'
import { askLLM, provider } from '@/lib/llm'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('llm provider', () => {
  it('picks the available key (Claude preferred, AI_PROVIDER overrides)', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('GEMINI_API_KEY', '')
    expect(provider()).toBeNull()
    vi.stubEnv('GEMINI_API_KEY', 'g')
    expect(provider()).toBe('gemini')
    vi.stubEnv('ANTHROPIC_API_KEY', 'a')
    expect(provider()).toBe('anthropic')
    vi.stubEnv('AI_PROVIDER', 'gemini')
    expect(provider()).toBe('gemini')
  })

  it('Gemini: maps roles, uses google_search, retries without it on 400, drops thought parts', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('GEMINI_API_KEY', 'g')
    const calls: any[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: any) => {
      const body = JSON.parse(init.body)
      calls.push({ url, body, headers: init.headers })
      if (body.tools) return new Response('no search', { status: 400 })
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ойлау', thought: true }, { text: 'Сәлем, Ернар!' }] } }] }), { status: 200 })
    }))
    const text = await askLLM({ system: ['sys'], messages: [{ role: 'user', content: 'сәлем' }, { role: 'assistant', content: 'иә' }, { role: 'user', content: 'қалайсың' }], maxTokens: 500, webSearch: true })
    expect(text).toBe('Сәлем, Ернар!')
    expect(calls).toHaveLength(2)
    expect(calls[0].url).toContain('gemini-flash-latest:generateContent')
    expect(calls[0].headers['x-goog-api-key']).toBe('g')
    expect(calls[0].body.tools).toEqual([{ google_search: {} }])
    expect(calls[1].body.contents.map((c: any) => c.role)).toEqual(['user', 'model', 'user'])
    expect(calls[1].body.systemInstruction.parts[0].text).toBe('sys')
  })

  it('throws 503 without any key', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('GEMINI_API_KEY', '')
    await expect(askLLM({ system: [], messages: [{ role: 'user', content: 'x' }], maxTokens: 10 })).rejects.toMatchObject({ status: 503 })
  })
})
