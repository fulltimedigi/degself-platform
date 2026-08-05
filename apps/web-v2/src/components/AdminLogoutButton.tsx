"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
      router.replace("/admin/login");
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold transition hover:border-[#FFD60A] disabled:opacity-60"
    >
      {busy ? "جارٍ الخروج..." : "خروج"}
    </button>
  );
}
