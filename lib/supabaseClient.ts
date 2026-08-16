"use client";

import { useEffect, useMemo, useState } from "react";
import RequireRole from "@/components/RequireRole";
import { useAuth } from "@/components/AuthProvider";
import LessonPlayer, { type LessonResult } from "@/components/LessonPlayer";
import {
  supabase,
  type Material,
  type LessonProgress,
} from "@/lib/supabaseClient";
import {
  levelFromXp,
  xpIntoCurrentLevel,
  xpNeededForNextLevel,
} from "@/lib/gamification";

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
  const { profile, user } = useAuth();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [myProgress, setMyProgress] = useState<LessonProgress[]>([]);
  const [leaderboardXp, setLeaderboardXp] = useState<Record<string, number>>({});
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("Барлығы");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [celebrateXp, setCelebrateXp] = useState<number | null>(null);

  useEffect(() => {
    if (user) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchAll() {
    setLoading(true);

    const [materialsRes, progressRes, allProgressRes, studentCountRes] =
      await Promise.all([
        supabase
          .from("materials")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("lesson_progress").select("*").eq("student_id", user!.id),
        supabase.from("lesson_progress").select("student_id, xp"),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "student"),
      ]);

    if (materialsRes.error) {
      setError(
        "Материалдарды жүктеу кезінде қате шықты: " + materialsRes.error.message
      );
    } else {
      setMaterials(materialsRes.data ?? []);
      setError(null);
    }

    setMyProgress((progressRes.data as LessonProgress[]) ?? []);

    const totals: Record<string, number> = {};
    (allProgressRes.data ?? []).forEach((row: { student_id: string; xp: number }) => {
      totals[row.student_id] = (totals[row.student_id] ?? 0) + (row.xp ?? 0);
    });
    setLeaderboardXp(totals);
    setStudentCount(studentCountRes.count ?? 0);

    setLoading(false);
  }

  const progressByMaterial = useMemo(() => {
    const map: Record<string, LessonProgress> = {};
    myProgress.forEach((p) => (map[p.material_id] = p));
    return map;
  }, [myProgress]);

  const totalXp = myProgress.reduce((sum, p) => sum + p.xp, 0);
  const level = levelFromXp(totalXp);
  const xpInLevel = xpIntoCurrentLevel(totalXp);
  const completedCount = myProgress.filter((p) => p.completed).length;
  const readyMaterials = materials.filter(
    (m) => m.structuring_status === "done" && m.structured_content
  );

  const answeredTotals = myProgress.reduce(
    (acc, p) => ({
      correct: acc.correct + p.correct_count,
      total: acc.total + p.total_count,
    }),
    { correct: 0, total: 0 }
  );
  const accuracy =
    answeredTotals.total > 0
      ? Math.round((answeredTotals.correct / answeredTotals.total) * 100)
      : null;

  const rank = useMemo(() => {
    if (!user) return null;
    const sorted = Object.entries(leaderboardXp).sort((a, b) => b[1] - a[1]);
    const idx = sorted.findIndex(([id]) => id === user.id);
    return idx === -1 ? null : idx + 1;
  }, [leaderboardXp, user]);

  const visibleMaterials =
    filter === "Барлығы"
      ? materials
      : materials.filter((m) => m.subject === filter);

  const subjectProgress = SUBJECT_FILTERS.filter((s) => s !== "Барлығы")
    .map((subject) => {
      const subjectReady = readyMaterials.filter((m) => m.subject === subject);
      const done = subjectReady.filter(
        (m) => progressByMaterial[m.id]?.completed
      ).length;
      const percent =
        subjectReady.length > 0
          ? Math.round((done / subjectReady.length) * 100)
          : 0;
      return { name: subject, percent, total: subjectReady.length };
    })
    .filter((s) => s.total > 0);

  async function handleLessonFinish(materialId: string, result: LessonResult) {
    if (!user) return;
    const existing = progressByMaterial[materialId];
    const completed =
      result.totalCount > 0 && result.correctCount === result.totalCount;
    const bestXp = Math.max(existing?.xp ?? 0, result.xpEarned);

    const payload = {
      student_id: user.id,
      material_id: materialId,
      correct_count: result.correctCount,
      total_count: result.totalCount,
      xp: bestXp,
      completed: existing?.completed || completed,
      updated_at: new Date().toISOString(),
    };

    const { data, error: upsertError } = await supabase
      .from("lesson_progress")
      .upsert(payload, { onConflict: "student_id,material_id" })
      .select()
      .single();

    if (!upsertError && data) {
      const row = data as LessonProgress;
      setMyProgress((prev) => [
        ...prev.filter((p) => p.material_id !== materialId),
        row,
      ]);
      const gained = bestXp - (existing?.xp ?? 0);
      if (gained > 0) {
        setCelebrateXp(gained);
        setTimeout(() => setCelebrateXp(null), 2200);
      }
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      {celebrateXp !== null && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 animate-bounce rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg">
          +{celebrateXp} XP 🎉
        </div>
      )}

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

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-card">
          <p className="text-[12px] font-medium text-ink-faint">Деңгей</p>
          <p className="mt-2 text-3xl font-semibold text-ink">{level}</p>
          <div className="mt-3 h-1.5 rounded-full bg-paper-tint">
            <div
              className="h-1.5 rounded-full bg-accent transition-all"
              style={{ width: `${xpInLevel}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-ink-faint">
            {xpInLevel} / {xpNeededForNextLevel()} XP келесі деңгейге дейін
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-card">
          <p className="text-[12px] font-medium text-ink-faint">
            Аяқталған сабақтар
          </p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {completedCount}
            <span className="text-base font-normal text-ink-faint">
              /{readyMaterials.length}
            </span>
          </p>
          <p className="mt-1 text-[12px] text-ink-faint">
            {accuracy !== null
              ? `Дәлдік: ${accuracy}%`
              : "Әлі сабақ бастамадыңыз"}
          </p>
        </div>

        <div className="rounded-2xl bg-ink p-6 text-white">
          <p className="text-[12px] font-medium text-white/50">
            Рейтингтегі орның
          </p>
          <p className="mt-2 font-display text-2xl font-semibold">
            {rank ? `#${rank}` : "—"}
          </p>
          <p className="mt-1 text-[12px] text-white/40">
            {studentCount > 0
              ? `${studentCount} оқушы ішінде`
              : "Жалпы XP бойынша"}
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
            {visibleMaterials.map((m) => {
              const progress = progressByMaterial[m.id];
              const ready =
                m.structuring_status === "done" && m.structured_content;

              return (
                <li key={m.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-accent-deep">
                          {m.subject}
                        </span>
                        <p className="font-medium text-ink">{m.title}</p>
                        {progress?.completed && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                            ✓ Аяқталды
                          </span>
                        )}
                        {progress && !progress.completed && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                            Жалғасуда
                          </span>
                        )}
                      </div>
                      {m.description && (
                        <p className="mt-1 text-[13px] text-ink-soft">
                          {m.description}
                        </p>
                      )}
                      {!ready && (
                        <p className="mt-1 text-[12px] text-ink-faint">
                          Мұғалім бұл материалды әлі дайындап жатыр
                        </p>
                      )}
                    </div>

                    {ready && (
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === m.id ? null : m.id)
                        }
                        className="shrink-0 rounded-full bg-ink px-4 py-1.5 text-[12px] font-medium text-white hover:bg-ink/90"
                      >
                        {expandedId === m.id
                          ? "Жасыру"
                          : progress
                          ? "Жалғастыру"
                          : "Сабақты бастау 🎮"}
                      </button>
                    )}
                  </div>

                  {expandedId === m.id && m.structured_content && (
                    <div className="mt-4 rounded-xl bg-paper-tint p-4">
                      <LessonPlayer
                        lesson={m.structured_content}
                        onFinish={(result) =>
                          handleLessonFinish(m.id, result)
                        }
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {subjectProgress.length > 0 && (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
          <h2 className="text-[16px] font-semibold text-ink">
            Пәндер бойынша прогресс
          </h2>
          <div className="mt-5 space-y-5">
            {subjectProgress.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-[13px]">
                  <span className="font-medium text-ink">{s.name}</span>
                  <span className="text-ink-faint">{s.percent}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-paper-tint">
                  <div
                    className="h-1.5 rounded-full bg-accent transition-all"
                    style={{ width: `${s.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
