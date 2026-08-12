"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, type Role } from "@/lib/supabaseClient";

const SUBJECTS = [
  "Математика",
  "Ағылшын тілі",
  "Биология",
  "Орыс тілі",
  "Қазақ тілі",
];

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("student");
  const [fullName, setFullName] = useState("");
  const [grade, setGrade] = useState("5 сынып");
  const [program, setProgram] = useState("НИШ");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Барлық міндетті жолдарды толтырыңыз.");
      return;
    }
    if (password.length < 6) {
      setError("Құпия сөз кемінде 6 таңбадан тұруы керек.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role,
          grade: role === "student" ? grade : null,
          program: role === "student" ? program : null,
          subject: role === "teacher" ? subject : null,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push(role === "teacher" ? "/teacher" : "/student");
      router.refresh();
    } else {
      // Email confirmation талап етіледі (Supabase жобасының баптауына байланысты)
      setNeedsConfirmation(true);
    }
  }

  if (needsConfirmation) {
    return (
      <section className="mx-auto flex max-w-sm flex-col px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Email-ды растаңыз
        </h1>
        <p className="mt-3 text-[14px] text-ink-soft">
          {email} мекенжайына растау сілтемесі жіберілді. Оны бассаңыз,
          аккаунт белсенді болады және кіре аласыз.
        </p>
        <Link
          href="/login"
          className="mt-6 font-medium text-accent hover:underline"
        >
          Кіру бетіне өту
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto flex max-w-sm flex-col px-6 py-16">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Тіркелу
      </h1>
      <p className="mt-2 text-[14px] text-ink-soft">
        {role === "student"
          ? "Оқушы ретінде тіркеліп, апталық тестілерге қатысыңыз."
          : "Мұғалім ретінде тіркеліп, материалдар қосыңыз."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-paper-tint p-1">
        <button
          type="button"
          onClick={() => setRole("student")}
          className={`rounded-full py-2 text-[13px] font-medium transition ${
            role === "student"
              ? "bg-white text-ink shadow-card"
              : "text-ink-faint"
          }`}
        >
          Оқушы
        </button>
        <button
          type="button"
          onClick={() => setRole("teacher")}
          className={`rounded-full py-2 text-[13px] font-medium transition ${
            role === "teacher"
              ? "bg-white text-ink shadow-card"
              : "text-ink-faint"
          }`}
        >
          Мұғалім
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-[13px] font-medium text-ink-soft">
            Аты-жөні
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Аты Тегі"
            className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-[14px] outline-none focus:border-accent"
          />
        </div>

        {role === "student" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-medium text-ink-soft">
                Сынып
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-[14px] outline-none focus:border-accent"
              >
                <option>5 сынып</option>
                <option>6 сынып</option>
              </select>
            </div>
            <div>
              <label className="text-[13px] font-medium text-ink-soft">
                Бағдарлама
              </label>
              <select
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-[14px] outline-none focus:border-accent"
              >
                <option>НИШ</option>
                <option>КТЛ</option>
                <option>РФМШ</option>
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-[13px] font-medium text-ink-soft">
              Пән
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-[14px] outline-none focus:border-accent"
            >
              {SUBJECTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-[13px] font-medium text-ink-soft">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-[14px] outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-[13px] font-medium text-ink-soft">
            Құпия сөз
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-[14px] outline-none focus:border-accent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-accent py-3 text-[14px] font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? "Тіркелуде..." : "Тіркелу"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-faint">
        Аккаунтыңыз бар ма?{" "}
        <Link href="/login" className="font-medium text-accent">
          Кіру
        </Link>
      </p>
    </section>
  );
}
