"use client";

import { useState } from "react";
import type { StructuredLesson } from "@/lib/supabaseClient";

export default function LessonView({ lesson }: { lesson: StructuredLesson }) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  function toggle(i: number) {
    setRevealed((r) => ({ ...r, [i]: !r[i] }));
  }

  return (
    <div className="space-y-6">
      <p className="text-[13px] text-ink-soft">{lesson.summary}</p>

      <div className="space-y-4">
        {lesson.sections?.map((s, i) => (
          <div key={i}>
            <h4 className="text-[14px] font-semibold text-ink">
              {s.heading}
            </h4>
            <p className="mt-1 whitespace-pre-line text-[13px] text-ink-soft">
              {s.content}
            </p>
          </div>
        ))}
      </div>

      {lesson.tasks?.length > 0 && (
        <div>
          <h4 className="text-[14px] font-semibold text-ink">Тапсырмалар</h4>
          <ol className="mt-3 space-y-4">
            {lesson.tasks.map((t, i) => (
              <li key={i} className="rounded-xl border border-line p-4">
                {t.image_url && (
                  <img
                    src={t.image_url}
                    alt={`Тапсырма ${i + 1} суреті`}
                    className="mb-3 max-h-64 w-auto rounded-lg border border-line object-contain"
                  />
                )}
                <p className="text-[13px] font-medium text-ink">
                  {i + 1}. {t.question}
                </p>
                {t.type === "choice" && t.options && (
                  <ul className="mt-2 space-y-1">
                    {t.options.map((o, oi) => (
                      <li
                        key={oi}
                        className="text-[13px] text-ink-soft"
                      >
                        {String.fromCharCode(65 + oi)}) {o}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => toggle(i)}
                  className="mt-2 text-[12px] font-medium text-accent hover:underline"
                >
                  {revealed[i] ? "Жауапты жасыру" : "Жауапты көрсету"}
                </button>
                {revealed[i] && (
                  <p className="mt-1 text-[13px] text-accent-deep">
                    {t.answer}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
