"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AlertTriangle } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { clearGuestFavorites } from "@/lib/favorites";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { ACCOUNT_DELETE_CONFIRMATION } from "@/lib/account-deletion";

type Phase = "idle" | "confirm" | "working" | "done";

const KNOWN_CODES = new Set([
  "AUTH_TOO_OLD",
  "ACCOUNT_HAS_PRIVILEGED_ROLE",
  "ACCOUNT_HAS_CLAIMED_WORKSHOP",
  "RATE_LIMITED",
  "INVALID_CONFIRMATION",
  "NOT_AUTHENTICATED",
]);

export function DeleteAccountSection({ nextAfterReauth }: { nextAfterReauth: string }) {
  const t = useTranslations("auth.delete");
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const confirmed = typed.trim() === ACCOUNT_DELETE_CONFIRMATION;
  const tooOld = errorCode === "AUTH_TOO_OLD";

  function errorMessage(code: string): string {
    return KNOWN_CODES.has(code) ? t(`errors.${code}`) : t("errors.generic");
  }

  async function submit() {
    if (!confirmed || phase === "working") return;
    setPhase("working");
    setErrorCode(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: typed.trim() }),
      });
      if (res.ok) {
        // Clear guest favorites + client auth state, then leave the account area.
        clearGuestFavorites();
        try {
          await createBrowserSupabaseClient().auth.signOut({ scope: "local" });
        } catch {
          /* server already deleted the identity */
        }
        setPhase("done");
        router.replace("/");
        router.refresh();
        return;
      }
      let code = "generic";
      try {
        const data = await res.json();
        if (data && typeof data.code === "string") code = data.code;
      } catch {
        /* non-JSON error body */
      }
      setErrorCode(code);
      setPhase("confirm");
    } catch {
      setErrorCode("generic");
      setPhase("confirm");
    }
  }

  if (phase === "done") {
    return (
      <section className="mt-10 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">{t("success")}</p>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-2xl border border-red-500/40 bg-red-500/5 p-5">
      <h2 className="flex items-center gap-2 text-lg font-extrabold text-red-500">
        <AlertTriangle size={18} aria-hidden />
        {t("dangerZone")}
      </h2>

      {phase === "idle" && (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
          <button
            type="button"
            onClick={() => {
              setErrorCode(null);
              setPhase("confirm");
            }}
            className="mt-4 rounded-xl border border-red-500/50 px-4 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-500/10"
          >
            {t("startButton")}
          </button>
        </>
      )}

      {phase !== "idle" && (
        <div className="mt-3 space-y-4">
          <div className="rounded-xl border border-border bg-background/50 p-4">
            <p className="text-sm font-bold">{t("consequencesTitle")}</p>
            <ul className="mt-2 list-disc space-y-1 pe-5 text-sm text-muted-foreground">
              <li>{t("consequences.identity")}</li>
              <li>{t("consequences.favorites")}</li>
              <li>{t("consequences.irreversible")}</li>
            </ul>
          </div>

          {errorCode && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {errorMessage(errorCode)}
            </p>
          )}

          {tooOld ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-sm text-muted-foreground">{t("reauthHint")}</p>
              <GoogleSignInButton next={nextAfterReauth} label={t("reauthButton")} />
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="delete-confirm"
                  className="mb-1.5 block text-sm font-bold"
                >
                  {t("confirmLabel", { token: ACCOUNT_DELETE_CONFIRMATION })}
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  dir="ltr"
                  autoComplete="off"
                  spellCheck={false}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={ACCOUNT_DELETE_CONFIRMATION}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-red-500"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={submit}
                  disabled={!confirmed || phase === "working"}
                  className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {phase === "working" ? t("deleting") : t("confirmButton")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhase("idle");
                    setTyped("");
                    setErrorCode(null);
                  }}
                  disabled={phase === "working"}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary disabled:opacity-60"
                >
                  {t("cancel")}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
