// ИИ құрастырған тест сұрақтарын тазалау (тесттерде тексеріледі)
type Q = { questionText: string; options: string[]; correctIndex: number }

/** ИИ жауабынан сұрақтарды тазалап алу */
export function parseQuestions(text: string, count: number): Q[] {
  const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)
  const arr = JSON.parse(json)
  if (!Array.isArray(arr)) return []
  return arr
    .map((q: any) => ({
      questionText: String(q?.question ?? q?.questionText ?? '').trim().slice(0, 1000),
      options: (Array.isArray(q?.options) ? q.options : []).slice(0, 4).map((o: any) => String(o ?? '').trim().slice(0, 300)),
      correctIndex: Number.isInteger(q?.correct) ? q.correct : Number.isInteger(q?.correctIndex) ? q.correctIndex : 0,
    }))
    .filter((q: Q) => q.questionText && q.options.length === 4 && q.options.every(Boolean) && q.correctIndex >= 0 && q.correctIndex < 4)
    .slice(0, count)
}

