// Review-analysis UI: trust banner, smart score, degself summary, and tag chips.
// All content is degself-owned analysis (scores/tags/summary) — never raw Google
// review text. Accents are light tints over the dark theme, not loud brand yellow.
import type { Enrichment, EnrichmentTag, TrustSignal, Confidence } from "@/lib/enrichment";

const TRUST: Record<
  TrustSignal,
  { label: string; icon: string; box: string; text: string }
> = {
  high: {
    label: "موثوق عالياً",
    icon: "✅",
    box: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-300",
  },
  medium: {
    label: "متوسط الثقة",
    icon: "⚠️",
    box: "bg-muted border-border",
    text: "text-muted-foreground",
  },
  low: {
    label: "ثقة محدودة",
    icon: "🔻",
    box: "bg-orange-500/10 border-orange-500/30",
    text: "text-orange-300",
  },
  warning: {
    label: "شكاوى متكررة",
    icon: "🚩",
    box: "bg-red-500/10 border-red-500/40",
    text: "text-red-300",
  },
};

const CONFIDENCE_NOTE: Record<Confidence, string> = {
  high: "بثقة عالية",
  medium: "بثقة متوسطة",
  low: "بثقة محدودة",
};

/** Trust-signal banner — placed directly after the title. Hidden when absent. */
export function TrustBanner({ signal }: { signal: TrustSignal | null | undefined }) {
  if (!signal) return null;
  const t = TRUST[signal];
  return (
    <div
      className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${t.box} ${t.text}`}
    >
      <span aria-hidden>{t.icon}</span>
      <span>{t.label}</span>
    </div>
  );
}

/** Smart score (0–100) with confidence — shown alongside Google stars, not instead. */
export function SmartScore({ enrichment }: { enrichment: Enrichment }) {
  const score = Math.round(enrichment.smart_score);
  const n = enrichment.reviews_total ?? enrichment.reviews_analyzed;
  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-extrabold leading-none text-foreground">
          {score}
          <span className="text-lg font-bold text-muted-foreground">/100</span>
        </span>
        <span className="text-base" aria-hidden>
          ⭐
        </span>
        <span className="text-sm text-muted-foreground">
          ({CONFIDENCE_NOTE[enrichment.confidence]})
        </span>
      </div>
      {n != null && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          محسوب من تحليل {n.toLocaleString("en-US")} تقييم
        </p>
      )}
    </div>
  );
}

/** degself summary paragraph (rewritten analysis — never a verbatim quote). */
export function EnrichmentSummary({ summary }: { summary: string | null | undefined }) {
  if (!summary) return null;
  return (
    <div className="mt-4">
      <p className="text-base leading-relaxed text-foreground/90">{summary}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        ملخّص مبني على تحليل تقييمات العملاء
      </p>
    </div>
  );
}

function Chip({ tag, tone }: { tag: EnrichmentTag; tone: "positive" | "negative" }) {
  const cls =
    tone === "positive"
      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-200"
      : "bg-orange-500/10 border-orange-500/25 text-orange-200";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${cls}`}
    >
      <span aria-hidden>{tag.icon}</span>
      <span>{tag.label}</span>
    </span>
  );
}

/** Positive + negative tag chips. Each section hides when its list is empty. */
export function EnrichmentTags({ enrichment }: { enrichment: Enrichment }) {
  const pos = enrichment.positive_tags ?? [];
  const neg = enrichment.negative_tags ?? [];
  if (pos.length === 0 && neg.length === 0) return null;
  return (
    <>
      {pos.length > 0 && (
        <section className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-bold">ما يميّز هذا الكراج</h2>
          <div className="flex flex-wrap gap-2">
            {pos.map((t) => (
              <Chip key={t.label} tag={t} tone="positive" />
            ))}
          </div>
        </section>
      )}
      {neg.length > 0 && (
        <section className="mt-4 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-bold">ملاحظات العملاء</h2>
          <div className="flex flex-wrap gap-2">
            {neg.map((t) => (
              <Chip key={t.label} tag={t} tone="negative" />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
