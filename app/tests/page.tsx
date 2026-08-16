"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TestRow = {
  id: string;
  subject: string;
  program: string | null;
  scheduled_for: string;
  duration_minutes: number;
  status: "scheduled" | "open" | "closed";
};

const DAY_NAMES_KK = [
  "Жексенбі",
  "Дүйсенбі",
  "Сейсенбі",
  "Сәрсенбі",
  "Бейсенбі",
  "Жұма",
  "Сенбі",
];

function formatDay(iso: string) {
  return DAY_NAMES_KK[new Date(iso).getDay()];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("kk-KZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABEL: Record<TestRow["status"], string> = {
  open: "Ашық",
  scheduled: "Жоспарда",
  closed: "Аяқталды",
};

export default function TestsPage() {
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comingSoonId, setComingSoonId] = useState<string | null>(null);

  useEffect(() => {
    fetchTests();
  }, []);

  async function fetchTests() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tests")
      .select("id, subject, program, scheduled_for, duration_minutes, status")
      .order("scheduled_for", { ascending: true })
      .limit(12);

    if (error) {
      setError("Тестілерді жүктеу кезінде қате шықты: " + error.message);
    } else {
      setTests((data as TestRow[]) ?? []);
      setError(null);
    }
    setLoading(false);
  }

  function handleStart(id: string) {
    // Тестті тапсыру логикасы (/api/submit-test) әлі дайын емес —
    // қазір тек жоспарды көрсетеміз.
    setComingSoonId(id);
    setTimeout(() => setComingSoonId((cur) => (cur === id ? null : cur)), 2500);
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-14">
      <p className="text-[13px] font-medium text-ink-soft">Тестілер</p>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
        Апта сайынғы кесте
      </h1>
      <p className="mt-2 text-[13px] text-ink-faint">
        Әр сәрсенбі және жексенбі сайын жаңа тест қолжетімді болады.
      </p>

      {error && (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-[13px] text-ink-faint">Жүктелуде...</p>
      ) : tests.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-paper-tint px-6 py-8 text-center text-[13px] text-ink-faint">
          Қазірше жоспарланған тест жоқ. Жақында жаңа тестілер қосылады.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {tests.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-card"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-paper-tint text-[11px] font-semibold text-ink-soft">
                  {formatDay(t.scheduled_for).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-[14px] font-medium text-ink">
                    {t.subject}
                    {t.program && (
                      <span className="ml-2 text-[11px] font-normal text-ink-faint">
                        {t.program}
                      </span>
                    )}
                  </p>
                  <p className="text-[12px] text-ink-faint">
                    {formatDay(t.scheduled_for)} · {formatTime(t.scheduled_for)}
                  </p>
                </div>
              </div>

              {t.status === "open" ? (
                <div className="text-right">
                  <button
                    onClick={() => handleStart(t.id)}
                    className="rounded-full bg-accent px-4 py-2 text-[12px] font-medium text-white hover:bg-accent-hover"
                  >
                    Тестті бастау
                  </button>
                  {comingSoonId === t.id && (
                    <p className="mt-1 text-[11px] text-ink-faint">
                      Тестті тапсыру жақында қосылады
                    </p>
                  )}
                </div>
              ) : (
                <span className="rounded-full bg-paper-tint px-4 py-2 text-[12px] font-medium text-ink-faint">
                  {STATUS_LABEL[t.status]}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
