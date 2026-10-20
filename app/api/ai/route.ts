import { NextResponse } from "next/server";

// ВАЖНО: перед продакшеном закройте этот маршрут проверкой роли admin (middleware/сессия),
// иначе любой посетитель сможет тратить ваши токены.
export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "Не задан ANTHROPIC_API_KEY в настройках Vercel" }, { status: 500 });

  const { question, context } = await req.json().catch(() => ({}));
  if (typeof question !== "string" || !question.trim() || question.length > 1000)
    return NextResponse.json({ error: "Введите вопрос (до 1000 символов)" }, { status: 400 });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
      max_tokens: 700,
      system: "Ты помощник администратора образовательного центра Daiyndal.kz. Отвечай по-русски, кратко и по делу, опираясь только на переданные данные. Если данных не хватает — так и скажи.",
      messages: [{ role: "user", content: `Данные центра (JSON):\n${JSON.stringify(context ?? {}).slice(0, 20000)}\n\nВопрос: ${question}` }],
    }),
  });
  if (!r.ok) return NextResponse.json({ error: "ИИ-сервис временно недоступен" }, { status: 502 });
  const d = await r.json();
  const answer = (d.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
  return NextResponse.json({ answer });
}
