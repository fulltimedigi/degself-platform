"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function UserLogoutButton({ className = "" }: { className?: string }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className={
        className ||
        "rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary disabled:opacity-60"
      }
    >
      {busy ? "…" : t("logout")}
    </button>
  );
}
