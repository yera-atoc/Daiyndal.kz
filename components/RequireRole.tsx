"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { Role } from "@/lib/supabaseClient";

export default function RequireRole({
  allow,
  children,
}: {
  allow: Role[];
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const authorized = !!user && !!profile && allow.includes(profile.role);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profile && !allow.includes(profile.role)) {
      router.replace(profile.role === "teacher" ? "/teacher" : "/student");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, profile]);

  if (loading || !authorized) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-24 text-center text-[13px] text-ink-faint">
        Жүктелуде...
      </div>
    );
  }

  return <>{children}</>;
}
