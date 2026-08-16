"use client";

import { useEffect, useState } from "react";
import RequireRole from "@/components/RequireRole";
import { useAuth } from "@/components/AuthProvider";
import { supabase, type Material } from "@/lib/supabaseClient";

const progressSubjects = [
  { name: "Математика", percent: 82 },
  { name: "Ағылшын тілі", percent: 74 },
  { name: "Биология", percent: 65 },
];

const SUBJECT_FILTERS = [
  "Барлығы",
  "Математика",
  "Ағылшын тілі",
  "Биология",
  "Орыс тілі",
  "Қазақ тілі",
];

export default function StudentDashboard() {
  return (
    <RequireRole allow={["student"]}>
      <StudentDashboardContent />
    </RequireRole>
  );
}

function StudentDashboardContent() {
  const { profile } = useAuth();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("Барлығы");

  useEffect(() => {
    fetchMaterials();
  }, []);

  async function fetchMaterials() {
    setLoading(true);
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError("Материалдарды жүктеу кезінде қате шықты: " + error.message);
    } else {
      setMaterials(data ?? []);
      setError(null);
    }
    setLoading(false);
  }

  const visibleMaterials =
    filter === "Барлығы"
      ? materials
      : materials.filter((m) => m.subject === filter);

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-ink-soft">
            Оқушы кабинеті
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
            Сәлем, {profile?.full_name ?? "Оқушы"}!
          </h1>
        </div>
        <span className="rounded-full bg-paper-tint px-4 py-1.5 text-[12px] font-medium text-ink-soft">
          {[profile?.program, profile?.grade].filter(Boolean).join(" · ") ||
            "Профиль толтырылмаған"}
        </span>
      </div>

      {/* Ескерту: төмендегі 3 карточка мен прогресс — әзірге демо деректер,
         нақты тест жүйесі қосылғанша осылай тұрады. */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-card">
          <p className="text-[12px] font-medium text-ink-faint">
            Жалпы рейтинг
          </p>
          <p className="mt-2 text-3xl font-semibold text-ink">#12</p>
          <p className="mt-1 text-[12px] text-ink-faint">
            245 оқушы ішінде · демо
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-card">
          <p className="text-[12px] font-medium text-ink-faint">
            Соңғы тест балы
          </p>
          <p className="mt-2 text-3xl font-semibold text-ink">88</p>
          <p className="mt-1 text-[12px] text-ink-faint">100 балдан · демо</p>
        </div>
        <div className="rounded-2xl bg-ink p-6 text-white">
          <p className="text-[12px] font-medium text-white/50">
            Келесі тест
          </p>
          <p className="mt-2 font-display text-2xl font-semibold">
            Сәрсенбі, 19:00
          </p>
          <p className="mt-1 text-[12px] text-white/40">
            Математика · демо
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[16px] font-semibold text-ink">
            Оқу материалдары
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {SUBJECT_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                  filter === s
                    ? "bg-accent text-white"
                    : "bg-paper-tint text-ink-soft hover:bg-line/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-5 text-[13px] text-ink-faint">Жүктелуде...</p>
        ) : visibleMaterials.length === 0 ? (
          <p className="mt-5 text-[13px] text-ink-faint">
            Бұл пән бойынша материал әлі қосылмаған.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-line/60">
            {visibleMaterials.map((m) => (
              <li key={m.id} className="py-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-accent-deep">
                    {m.subject}
                  </span>
                  <p className="font-medium text-ink">{m.title}</p>
                </div>
                {m.description && (
                  <p className="mt-1 text-[13px] text-ink-soft">
                    {m.description}
                  </p>
                )}
                {m.file_url ? (
                  <a
                    href={m.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-[12px] text-accent hover:underline"
                  >
                    Жүктеп алу — {m.file_name ?? "файл"}
                  </a>
                ) : (
                  <p className="mt-1 text-[12px] text-ink-faint">
                    Файл қосылмаған
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
        <h2 className="text-[16px] font-semibold text-ink">
          Пәндер бойынша прогресс{" "}
          <span className="text-[12px] font-normal text-ink-faint">
            (демо)
          </span>
        </h2>
        <div className="mt-5 space-y-5">
          {progressSubjects.map((s) => (
            <div key={s.name}>
              <div className="flex justify-between text-[13px]">
                <span className="font-medium text-ink">{s.name}</span>
                <span className="text-ink-faint">{s.percent}%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-paper-tint">
                <div
                  className="h-1.5 rounded-full bg-accent"
                  style={{ width: `${s.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
