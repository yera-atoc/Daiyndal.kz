"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, type Role } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Email және құпия сөзді енгізіңіз.");
      return;
    }

    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(
        signInError.message === "Invalid login credentials"
          ? "Email немесе құпия сөз қате."
          : signInError.message
      );
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    setLoading(false);

    const actualRole = (profile?.role as Role) ?? role;
    router.push(actualRole === "teacher" ? "/teacher" : "/student");
    router.refresh();
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Жүйеге кіру
      </h1>
      <p className="mt-2 text-[14px] text-ink-soft">
        Аккаунтыңызға кіріп, оқуды жалғастырыңыз.
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
          {loading ? "Кіруде..." : "Кіру"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-faint">
        Аккаунтыңыз жоқ па?{" "}
        <Link href="/register" className="font-medium text-accent">
          Тіркелу
        </Link>
      </p>
    </section>
  );
}
