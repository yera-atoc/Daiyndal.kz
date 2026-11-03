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

import { friendlyError, LlmError } from '@/lib/llm'

describe('gemini robustness', () => {
  it('on 404 picks an available flash model from the list and retries', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubEnv('GEMINI_API_KEY', ' g ')
    vi.stubEnv('GEMINI_MODEL', 'gemini-old')
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(url)
      if (url.endsWith('/models?pageSize=200'))
        return new Response(JSON.stringify({ models: [
          { name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-3.8-flash-tts', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
        ] }), { status: 200 })
      if (url.includes('gemini-old')) return new Response('{"error":{"status":"NOT_FOUND"}}', { status: 404 })
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Жауап' }] } }] }), { status: 200 })
    }))
    expect(await askLLM({ system: ['s'], messages: [{ role: 'user', content: 'x' }], maxTokens: 100 })).toBe('Жауап')
    expect(urls[2]).toContain('gemini-3.8-flash:generateContent')
  })

  it('explains common errors in Kazakh', () => {
    expect(friendlyError(new LlmError(400, 'Gemini 400: API key not valid. API_KEY_INVALID'))).toContain('кілті жарамсыз')
    expect(friendlyError(new LlmError(429, 'RESOURCE_EXHAUSTED'))).toContain('квота')
    expect(friendlyError(new LlmError(400, 'User location is not supported for the API use.'))).toContain('аймақта')
  })
})
