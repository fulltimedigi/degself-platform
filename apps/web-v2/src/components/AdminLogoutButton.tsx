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
      className="rounded-lg border-2 border-[#FFD60A] bg-[#FFD60A] px-4 py-2 text-sm font-extrabold text-[#0A0A0A] transition hover:brightness-95 disabled:opacity-60"
    >
      {busy ? "جارٍ الخروج..." : "خروج"}
    </button>
  );
}
