// ИИ-бағалау: IELTS және TOEFL Writing/Speaking. Тек серверде (askLLM арқылы Claude не Gemini).
// Нәтиже — алдын ала баға: мұғалім тексеріп, өзгерте алады. Пікір қазақ тілінде, мысалдар ағылшынша.
import { askLLM, provider } from './llm'

export type AiExam = 'ielts' | 'toefl'
export type WritingTask = 'task1' | 'task2' | 'email' | 'discussion'
export type SpeakingTask = 'part1' | 'part2' | 'part3' | 'interview' | 'repeat'

export type AiFix = { from: string; to: string; why: string }
export type AiResult = {
  kind: 'writing' | 'speaking'
  exam: AiExam
  task: string
  scores: Record<string, number> // IELTS: ta/cc/lr/gra не fc/lr/gra/p (0–9); TOEFL: score (1–6)
  band: number // IELTS 0–9, TOEFL 1–6
  summary: string
  strengths: string[]
  improve: string[]
  fixes: AiFix[]
  better?: string // жақсартылған нұсқа (үзінді)
  words?: number
  wpm?: number
  note?: string
  model?: string
}

export const aiAvailable = () => provider() !== null

const MODEL = { anthropic: process.env.AI_GRADE_MODEL ?? 'claude-sonnet-5-5', gemini: process.env.AI_GRADE_GEMINI_MODEL }

const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length
const half = (x: number) => Math.round(x * 2) / 2
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

function roundIelts(x: number) {
  const f = Math.floor(x)
  const d = x - f
  return d < 0.25 ? f : d < 0.75 ? f + 0.5 : f + 1
}

const LANG = `Write all feedback text (summary, strengths, improve, why) in KAZAKH (Cyrillic), simple and friendly for a school student. Keep quoted English examples, corrections and the improved version in English.`

const JSON_SHAPE = (keys: string[], scale: string) => `Return ONLY a JSON object, no markdown, exactly this shape:
{"scores": {${keys.map((k) => `"${k}": number`).join(', ')}}, "summary": "2–3 sentences", "strengths": ["…", "…"], "improve": ["concrete step", "…", "…"], "fixes": [{"from": "exact phrase from the answer", "to": "corrected phrase", "why": "short reason"}], "better": "improved version of 2–4 key sentences"}
Scores use ${scale}. Give 3–8 fixes taken verbatim from the answer (most important errors first). If the answer is empty or off-topic, give low scores and say so.`

const IELTS_W = `You are a certified IELTS Writing examiner. Score strictly by the official public band descriptors:
ta = Task Achievement (Task 1) / Task Response (Task 2), cc = Coherence and Cohesion, lr = Lexical Resource, gra = Grammatical Range and Accuracy.
Under-length answers are penalised in ta (Task 1 < 150 words, Task 2 < 250 words). Memorised or off-topic text scores low. Do not inflate scores.`

const TOEFL_W = `You are an experienced TOEFL iBT Writing rater (2026 format). Tasks: "Write an Email" and "Writing for an Academic Discussion".
Score holistically on the 1–6 band scale (half points allowed): 6 = fully successful, clear, well-elaborated, accurate varied language; 5 = generally successful with minor lapses; 4 = adequate, some unclear parts or errors; 3 = partially successful, limited elaboration, noticeable errors; 2 = mostly unsuccessful; 1 = minimal or off-topic.
For email: check all required points are addressed, tone and register fit the reader. For discussion: a clear opinion that contributes to the conversation with reasons/examples (about 100+ words).`

const IELTS_S = `You are a certified IELTS Speaking examiner. You get an automatic speech-to-text TRANSCRIPT of the candidate's answer (no punctuation may be present; recognition errors are possible), plus speaking duration.
Score by the official public band descriptors: fc = Fluency and Coherence, lr = Lexical Resource, gra = Grammatical Range and Accuracy, p = Pronunciation.
Pronunciation cannot be heard: estimate p conservatively from transcript clarity (recognition failures, broken words) and never higher than fc + 0.5. Very short answers (few words for the time) lower fc. Do not inflate scores.`

const TOEFL_S = `You are an experienced TOEFL iBT Speaking rater (2026 format: "Listen and Repeat" and "Take an Interview"). You get an automatic speech-to-text TRANSCRIPT and the duration.
Score holistically on the 1–6 band scale (half points allowed) for delivery (estimated from fluency signs in the transcript), language use and topic development. For "repeat" compare the transcript with the target sentence: accuracy of words matters most.`

function parseJson(text: string): any {
  const s = text.indexOf('{')
  const e = text.lastIndexOf('}')
  if (s < 0 || e <= s) throw new Error('ИИ жауабы оқылмады')
  return JSON.parse(text.slice(s, e + 1))
}

function clean(raw: any, keys: string[], ielts: boolean): Pick<AiResult, 'scores' | 'summary' | 'strengths' | 'improve' | 'fixes' | 'better'> {
  const scores: Record<string, number> = {}
  for (const k of keys) {
    const v = Number(raw?.scores?.[k])
    scores[k] = Number.isFinite(v) ? (ielts ? clamp(half(v), 0, 9) : clamp(half(v), 1, 6)) : ielts ? 0 : 1
  }
  const str = (v: unknown, n = 600) => (typeof v === 'string' ? v.trim().slice(0, n) : '')
  const arr = (v: unknown, n = 6) => (Array.isArray(v) ? v.map((x) => str(x, 300)).filter(Boolean).slice(0, n) : [])
  const fixes = (Array.isArray(raw?.fixes) ? raw.fixes : [])
    .map((f: any) => ({ from: str(f?.from, 200), to: str(f?.to, 200), why: str(f?.why, 200) }))
    .filter((f: AiFix) => f.from && f.to && f.from !== f.to)
    .slice(0, 10)
  return { scores, summary: str(raw?.summary, 800), strengths: arr(raw?.strengths), improve: arr(raw?.improve), fixes, better: str(raw?.better, 1500) || undefined }
}

export async function gradeWriting(o: { exam: AiExam; task: WritingTask; prompt: string; text: string; variant?: 'academic' | 'general'; imageNote?: string }): Promise<AiResult> {
  const ielts = o.exam === 'ielts'
  const keys = ielts ? ['ta', 'cc', 'lr', 'gra'] : ['score']
  const n = words(o.text)
  const taskName = ielts
    ? o.task === 'task1'
      ? o.variant === 'general' ? 'IELTS General Training Writing Task 1 (letter, min 150 words)' : 'IELTS Academic Writing Task 1 (report on visual data, min 150 words)'
      : 'IELTS Writing Task 2 (essay, min 250 words)'
    : o.task === 'email' ? 'TOEFL Write an Email' : 'TOEFL Writing for an Academic Discussion'
  const system = [ielts ? IELTS_W : TOEFL_W, LANG, JSON_SHAPE(keys, ielts ? 'IELTS bands 0–9 in 0.5 steps' : 'the TOEFL 1–6 band scale in 0.5 steps')]
  const user = `TASK TYPE: ${taskName}
TASK PROMPT:
${o.prompt.slice(0, 4000)}
${o.imageNote ? `(The task includes a chart/diagram image that you cannot see: judge Task Achievement by how clearly the answer describes and compares the data; do not penalise specific numbers you cannot verify.)\n` : ''}
CANDIDATE ANSWER (${n} words):
"""
${o.text.slice(0, 12000)}
"""`
  const text = await askLLM({ system, messages: [{ role: 'user', content: user }], maxTokens: 1800, model: MODEL })
  const c = clean(parseJson(text), keys, ielts)
  const band = ielts ? roundIelts(keys.reduce((a, k) => a + c.scores[k], 0) / keys.length) : c.scores.score
  return { kind: 'writing', exam: o.exam, task: o.task, ...c, band, words: n, model: provider() ?? undefined }
}

export async function gradeSpeaking(o: { exam: AiExam; task: SpeakingTask; question: string; transcript: string; seconds: number; target?: string }): Promise<AiResult> {
  const ielts = o.exam === 'ielts'
  const keys = ielts ? ['fc', 'lr', 'gra', 'p'] : ['score']
  const n = words(o.transcript)
  const wpm = o.seconds > 5 ? Math.round((n / o.seconds) * 60) : undefined
  const taskName = ielts
    ? { part1: 'IELTS Speaking Part 1 (short interview answer, ~20–40 s)', part2: 'IELTS Speaking Part 2 (long turn, 1–2 minutes)', part3: 'IELTS Speaking Part 3 (discussion, ~40–60 s)' }[o.task as 'part1'] ?? 'IELTS Speaking'
    : o.task === 'repeat' ? 'TOEFL Listen and Repeat' : 'TOEFL Take an Interview'
  const system = [ielts ? IELTS_S : TOEFL_S, LANG, JSON_SHAPE(keys, ielts ? 'IELTS bands 0–9 in 0.5 steps' : 'the TOEFL 1–6 band scale in 0.5 steps')]
  const user = `TASK TYPE: ${taskName}
QUESTION / CUE CARD:
${o.question.slice(0, 2000)}
${o.target ? `TARGET SENTENCE TO REPEAT: ${o.target}\n` : ''}
SPEAKING TIME: ${Math.round(o.seconds)} seconds · ${n} words${wpm ? ` · ~${wpm} words per minute` : ''}
TRANSCRIPT (automatic speech recognition):
"""
${o.transcript.slice(0, 6000) || '(no speech recognised)'}
"""`
  const text = await askLLM({ system, messages: [{ role: 'user', content: user }], maxTokens: 1500, model: MODEL })
  const c = clean(parseJson(text), keys, ielts)
  const band = ielts ? roundIelts(keys.reduce((a, k) => a + c.scores[k], 0) / keys.length) : c.scores.score
  return {
    kind: 'speaking',
    exam: o.exam,
    task: o.task,
    ...c,
    band,
    words: n,
    wpm,
    note: 'Айтылым (Pronunciation) дыбыстан емес, мәтіннен шамамен бағаланды — мұғалім тыңдап нақтылайды.',
    model: provider() ?? undefined,
  }
}

/** Speaking жазбасын мәтінге айналдыру (тек Gemini кілті болса). Браузер мәтінді таба алмағанда қолданылады. */
export async function transcribeAudio(bytes: ArrayBuffer, mime: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) return null
  const model = process.env.GEMINI_AUDIO_MODEL ?? 'gemini-flash-latest'
  const b64 = Buffer.from(bytes).toString('base64')
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mime.split(';')[0] || 'audio/webm', data: b64 } }, { text: 'Transcribe this English speech verbatim (keep hesitations like "um", false starts and grammar mistakes). Output only the transcript text.' }] }],
      generationConfig: { maxOutputTokens: 2048 },
    }),
    cache: 'no-store',
  })
  if (!r.ok) return null
  const d = await r.json()
  const t = (d.candidates?.[0]?.content?.parts ?? []).filter((p: any) => typeof p.text === 'string' && !p.thought).map((p: any) => p.text).join(' ').trim()
  return t || null
}
