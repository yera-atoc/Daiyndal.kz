"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type LeaderboardRow = {
  student_id: string;
  full_name: string | null;
  program: string | null;
  total_score: number;
  tests_taken: number;
};

export default function RatingPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    setLoading(true);
    const { data, error } = await supabase
      .from("leaderboard")
      .select("student_id, full_name, program, total_score, tests_taken")
      .gt("tests_taken", 0)
      .order("total_score", { ascending: false })
      .limit(20);

    if (error) {
      setError("Рейтингті жүктеу кезінде қате шықты: " + error.message);
    } else {
      setRows((data as LeaderboardRow[]) ?? []);
      setError(null);
    }
    setLoading(false);
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-14">
      <p className="text-[13px] font-medium text-ink-soft">Апталық рейтинг</p>
      <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
        Осы аптаның үздіктері
      </h1>
      <p className="mt-2 text-[13px] text-ink-faint">
        Сәрсенбі және жексенбі тестілерінің нәтижелері бойынша.
      </p>

      {error && (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-[13px] text-ink-faint">Жүктелуде...</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-paper-tint px-6 py-8 text-center text-[13px] text-ink-faint">
          Әзірге тест тапсырған оқушы жоқ. Бірінші болып тест тапсырып,
          рейтингте орын ал!
        </p>
      ) : (
        <div className="mt-8 rounded-2xl bg-white shadow-card">
          {rows.map((r, i) => (
            <div
              key={r.student_id}
              className={`flex items-center justify-between px-6 py-4 ${
                i !== rows.length - 1 ? "border-b border-line/60" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold ${
                    i === 0 ? "bg-ink text-white" : "bg-paper-tint text-ink-soft"
                  }`}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-[14px] font-medium text-ink">
                    {r.full_name ?? "Аты-жөні көрсетілмеген"}
                  </p>
                  <p className="text-[12px] text-ink-faint">
                    {r.program ?? "—"} · {r.tests_taken} тест
                  </p>
                </div>
              </div>
              <span className="text-[16px] font-semibold text-accent">
                {r.total_score}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
