import { NextRequest, NextResponse } from "next/server";
// ВАЖНО: импорт "pdf-parse/worker" должен идти ДО импорта "pdf-parse" —
// он настраивает canvas-полифиллы (DOMMatrix и т.д.), без которых
// pdf-parse падает на Vercel serverless при загрузке модуля.
import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import JSZip from "jszip";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CHARS = 18000;

const SYSTEM_PROMPT = `Сен — қазақ тілінде сабақ дайындайтын білім беру көмекшісісің.
Саған оқулық/материал мәтіні беріледі, кейде оған қоса материалдан алынған
суреттер де тіркеледі (мысалы, логикалық жұмбақ, геометриялық фигура, кесте,
формула суреті). Осы мәтін мен суреттер негізінде оқушыға арналған құрылымды
сабақ жаса: қысқаша түсіндірме бөлімдер (лекция) және соңында білімін
тексеретін тапсырмалар.

Егер саған суреттер тіркелген болса (олар "Сурет 1", "Сурет 2" деп нөмірленген,
0-ден бастап индекстеледі), әр маңызды суретті мұқият қара және сол суретте
көрсетілген есепті/жұмбақты нақты шеш. Сол суретке негізделген тапсырма
жасағанда, тапсырма объектісіне "image_index" өрісін қос (0-негізделген сан,
суреттің реттік нөмірі). Тапсырманың "answer" өрісінде — сол суреттегі есепті
өзің шешіп, дұрыс жауапты жаз (болжамай, нақты есептеп). Мәтінге негізделген
(суретсіз) тапсырмаларда "image_index" өрісін қоспа немесе null қой.

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
      "answer": "Дұрыс жауап (options ішіндегі бір нұсқа)",
      "image_index": 0
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
- Суреттер тіркелген болса, кемінде әр суретке 1 тапсырма арнауға тырыс (маңызды, мазмұнды суреттер үшін).
- Мәтін нақты материалдың мазмұнына негізделсін, ойдан шығарма.
- Барлығы қазақ тілінде болсын.`;

const MAX_IMAGES = 8;
const IMAGE_EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

type ExtractedImage = {
  ext: string;
  mimeType: string;
  buffer: Buffer;
  base64: string;
};

async function extractDocxImages(buffer: Buffer): Promise<ExtractedImage[]> {
  const zip = await JSZip.loadAsync(buffer);
  const mediaFiles = Object.keys(zip.files)
    .filter((name) => name.startsWith("word/media/"))
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });

  const images: ExtractedImage[] = [];
  for (const name of mediaFiles) {
    const ext = (name.split(".").pop() || "").toLowerCase();
    const mimeType = IMAGE_EXT_MIME[ext];
    if (!mimeType) continue; // emf/wmf сияқты қолдау көрсетілмейтін форматтарды өткізіп жіберу

    const fileBuffer = await zip.files[name].async("nodebuffer");
    images.push({
      ext,
      mimeType,
      buffer: fileBuffer,
      base64: fileBuffer.toString("base64"),
    });

    if (images.length >= MAX_IMAGES) break;
  }

  return images;
}

const SUPPORTED_EXTENSIONS = [".pdf", ".docx"];

async function extractContentFromFile(
  fileUrl: string
): Promise<{ text: string; images: ExtractedImage[] }> {
  const lowerUrl = fileUrl.toLowerCase();

  if (lowerUrl.endsWith(".pdf")) {
    const parser = new PDFParse({ url: fileUrl, CanvasFactory });
    try {
      const parsed = await parser.getText();
      return { text: (parsed.text || "").trim(), images: [] };
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

    const [textResult, images] = await Promise.all([
      mammoth.extractRawText({ buffer }),
      extractDocxImages(buffer),
    ]);

    return { text: (textResult.value || "").trim(), images };
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
    // 1) Файлдан мәтін мен суреттерді алу (PDF немесе DOCX)
    const { text, images } = await extractContentFromFile(material.file_url);

    if (!text && images.length === 0) {
      throw new Error(
        "Файлдан мазмұн алынбады (мүмкін, ол сканерленген сурет форматында)."
      );
    }
    const truncated = text.slice(0, MAX_CHARS);

    // Суреттерді Supabase Storage-ке жүктеп, жария сілтемелерін аламыз
    const imageUrls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const path = `lesson-images/${materialId}/${i}.${img.ext}`;
      const { error: uploadError } = await supabase.storage
        .from("materials")
        .upload(path, img.buffer, {
          contentType: img.mimeType,
          upsert: true,
        });
      if (uploadError) {
        // Жүктеу сәтсіз болса, сол суретті өткізіп жібереміз (тапсырма мәтінге негізделеді)
        imageUrls.push("");
        continue;
      }
      const { data: publicData } = supabase.storage
        .from("materials")
        .getPublicUrl(path);
      imageUrls.push(publicData.publicUrl);
    }

    // 2) Gemini арқылы құрылымдау
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY орнатылмаған (Vercel env vars).");
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-3.7-flash";

    const userParts: Array<
      { text: string } | { inline_data: { mime_type: string; data: string } }
    > = [
      {
        text: `Пән: ${material.subject}\nТақырып: ${material.title}\n\nМатериал мәтіні:\n${truncated}`,
      },
    ];

    images.forEach((img, i) => {
      userParts.push({ text: `Сурет ${i}:` });
      userParts.push({
        inline_data: { mime_type: img.mimeType, data: img.base64 },
      });
    });

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
              parts: userParts,
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

    // "image_index" өрісін нақты жүктелген сурет сілтемесіне (image_url) ауыстыру
    if (Array.isArray(structured?.tasks)) {
      structured.tasks = structured.tasks.map((task: any) => {
        const { image_index, ...rest } = task ?? {};
        if (
          typeof image_index === "number" &&
          imageUrls[image_index] &&
          imageUrls[image_index].length > 0
        ) {
          return { ...rest, image_url: imageUrls[image_index] };
        }
        return rest;
      });
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
