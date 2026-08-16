import { NextRequest, NextResponse } from "next/server";
// ВАЖНО: импорт "pdf-parse/worker" должен идти ДО импорта "pdf-parse" —
// он настраивает canvas-полифиллы (DOMMatrix и т.д.), без которых
// pdf-parse падает на Vercel serverless при загрузке модуля.
import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CHARS = 18000;

const SYSTEM_PROMPT = `Сен — қазақ тілінде сабақ дайындайтын білім беру көмекшісісің.
Саған оқулық/материал мәтіні беріледі. Осы мәтін негізінде оқушыға арналған
құрылымды сабақ жаса: қысқаша түсіндірме бөлімдер (лекция) және соңында
білімін тексеретін тапсырмалар.

Тек төмендегі JSON форматында жауап бер, басқа ешбір мәтін қоспа
(түсініктеме, markdown белгілері \`\`\` да болмасын):

{
  "summary": "материалдың 2-3 сөйлемдік қысқаша сипаттамасы",
  "sections": [
    { "heading": "Бөлім атауы", "content": "Түсіндірме мәтін, бір немесе бірнеше абзац" }
  ],
  "tasks": [
    {
      "question": "Сұрақ мәтіні",
      "type": "choice",
      "options": ["A нұсқасы", "B нұсқасы", "C нұсқасы", "D нұсқасы"],
      "answer": "Дұрыс жауап (options ішіндегі бір нұсқа)"
    },
    {
      "question": "Ашық сұрақ мәтіні",
      "type": "open",
      "answer": "Күтілетін жауап немесе шешу жолы"
    }
  ]
}

Талаптар:
- "sections" кемінде 2, көбінде 5 бөлімнен тұрсын.
- "tasks" кемінде 4, көбінде 8 тапсырмадан тұрсын, choice және open түрлерін араластыр.
- Мәтін нақты материалдың мазмұнына негізделсін, ойдан шығарма.
- Барлығы қазақ тілінде болсын.`;

const SUPPORTED_EXTENSIONS = [".pdf", ".docx"];

async function extractTextFromFile(fileUrl: string): Promise<string> {
  const lowerUrl = fileUrl.toLowerCase();

  if (lowerUrl.endsWith(".pdf")) {
    const parser = new PDFParse({ url: fileUrl, CanvasFactory });
    try {
      const parsed = await parser.getText();
      return (parsed.text || "").trim();
    } finally {
      await parser.destroy();
    }
  }

  if (lowerUrl.endsWith(".docx")) {
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      throw new Error(`Файлды жүктеу мүмкін болмады: ${fileRes.status}`);
    }
    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await mammoth.extractRawText({ buffer });
    return (result.value || "").trim();
  }

  throw new Error("Қолдау көрсетілмейтін файл форматы");
}

export async function POST(req: NextRequest) {
  let materialId: string | undefined;

  try {
    const body = await req.json();
    materialId = body.materialId;
  } catch {
    return NextResponse.json({ error: "Дұрыс емес сұраныс" }, { status: 400 });
  }

  if (!materialId) {
    return NextResponse.json(
      { error: "materialId жіберілмеген" },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: material, error: fetchError } = await supabase
    .from("materials")
    .select("*")
    .eq("id", materialId)
    .single();

  if (fetchError || !material) {
    return NextResponse.json(
      { error: "Материал табылмады: " + (fetchError?.message ?? "") },
      { status: 404 }
    );
  }

  if (!material.file_url) {
    return NextResponse.json(
      { error: "Бұл материалда файл жоқ" },
      { status: 400 }
    );
  }

  const lowerUrl = material.file_url.toLowerCase();
  const isSupported = SUPPORTED_EXTENSIONS.some((ext) =>
    lowerUrl.endsWith(ext)
  );
  if (!isSupported) {
    return NextResponse.json(
      {
        error:
          "Қазірше тек PDF және DOCX файлдар қолдау табады. Бұл файл — " +
          (material.file_name ?? "белгісіз формат") +
          ". Ескі .doc форматын .docx немесе PDF-ке айналдырып қайта жүктеңіз.",
      },
      { status: 400 }
    );
  }

  await supabase
    .from("materials")
    .update({ structuring_status: "processing", structuring_error: null })
    .eq("id", materialId);

  try {
    // 1) Файлдан мәтінді алу (PDF немесе DOCX)
    const text = await extractTextFromFile(material.file_url);

    if (!text) {
      throw new Error(
        "Файлдан мәтін алынбады (мүмкін, ол сканерленген сурет форматында)."
      );
    }
    const truncated = text.slice(0, MAX_CHARS);

    // 2) Gemini арқылы құрылымдау
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY орнатылмаған (Vercel env vars).");
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-3.7-flash";
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Пән: ${material.subject}\nТақырып: ${material.title}\n\nМатериал мәтіні:\n${truncated}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`Gemini API қатесі: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    const rawText =
      aiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!rawText) {
      const blockReason = aiData.promptFeedback?.blockReason;
      throw new Error(
        blockReason
          ? `Gemini жауап бермеді (себебі: ${blockReason})`
          : "Gemini бос жауап қайтарды."
      );
    }

    const cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "");

    let structured;
    try {
      structured = JSON.parse(cleaned);
    } catch {
      throw new Error("AI жауабын JSON ретінде оқу мүмкін болмады.");
    }

    await supabase
      .from("materials")
      .update({
        structured_content: structured,
        structuring_status: "done",
        structuring_error: null,
      })
      .eq("id", materialId);

    return NextResponse.json({ ok: true, structured });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("materials")
      .update({ structuring_status: "error", structuring_error: message })
      .eq("id", materialId);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
