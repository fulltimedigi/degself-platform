"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { track } from "@/lib/track";

export function ReviewForm({ placeId }: { placeId: string }) {
  const t = useTranslations("workshop.review");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (rating < 1) {
      setError(t("errStars"));
      return;
    }
    if (body.trim().length < 3) {
      setError(t("errBody"));
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: placeId, rating, name, body, website }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? t("errSend"));
        return;
      }
      track("review_submit", { place_id: placeId });
      setStatus("done");
    } catch {
      setStatus("error");
      setError(t("errConn"));
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">
        {t("thankYou")}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="font-bold">{t("addTitle")}</p>

      {/* stars */}
      <div className="flex items-center gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={t("starsAria", { n })}
            className="p-0.5"
          >
            <Star
              size={26}
              className={(hover || rating) >= n ? "text-yellow-400" : "text-muted-foreground/40"}
              fill={(hover || rating) >= n ? "currentColor" : "none"}
            />
          </button>
        ))}
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("namePlaceholder")}
        maxLength={60}
        className="rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("bodyPlaceholder")}
        rows={4}
        maxLength={1000}
        className="rounded-xl border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />

      {/* honeypot — hidden from humans */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        aria-hidden
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-fit rounded-xl bg-primary px-6 py-2.5 font-bold text-primary-foreground shadow-md transition hover:opacity-90 hover:shadow-primary/30 disabled:cursor-not-allowed disabled:bg-primary/40 disabled:text-primary-foreground/70 disabled:shadow-none"
      >
        {status === "sending" ? t("submitting") : t("submit")}
      </button>

      <p className="text-xs text-muted-foreground">
        {t("moderated")}
      </p>
    </form>
  );
}
