import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

type AnalyticsQuote = {
  id: string;
  created_at: string;
  status: string;
  source: string;
  service: string;
};

type AnalyticsOffer = {
  id: string;
  quote_id: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
};

export type ConversionStage = {
  key: "quotes" | "routed" | "offers" | "accepted";
  label: string;
  count: number;
  fromStart: number;
  fromPrevious: number;
};

export type ConversionAnalytics = {
  days: AnalyticsRange;
  generatedAt: string;
  stages: ConversionStage[];
  totalOffers: number;
  medianFirstOfferHours: number | null;
  daily: Array<{ date: string; quotes: number; offers: number; accepted: number }>;
  sources: Array<{ name: string; count: number; percent: number }>;
  services: Array<{ name: string; count: number; percent: number }>;
};

function percent(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function countBy<T>(rows: T[], getKey: (row: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = getKey(row) || "غير محدد";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function breakdown(counts: Map<string, number>, total: number) {
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, percent: percent(count, total) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ar"));
}

export function buildConversionAnalytics(
  quotes: AnalyticsQuote[],
  offers: AnalyticsOffer[],
  days: AnalyticsRange,
  now = new Date()
): ConversionAnalytics {
  const quoteIds = new Set(quotes.map((quote) => quote.id));
  const relevantOffers = offers.filter((offer) => quoteIds.has(offer.quote_id));
  const quoteIdsWithOffers = new Set(relevantOffers.map((offer) => offer.quote_id));
  const acceptedQuoteIds = new Set(
    quotes.filter((quote) => quote.status === "accepted").map((quote) => quote.id)
  );
  for (const offer of relevantOffers) {
    if (offer.status === "accepted" || offer.accepted_at) {
      acceptedQuoteIds.add(offer.quote_id);
    }
  }

  const totalQuotes = quotes.length;
  const routed = quotes.filter((quote) => quote.status !== "new").length;
  const withOffers = quoteIdsWithOffers.size;
  const accepted = acceptedQuoteIds.size;
  const counts = [totalQuotes, routed, withOffers, accepted];
  const labels = [
    ["quotes", "طلبات السعر"],
    ["routed", "تم توجيهها للكراجات"],
    ["offers", "وصلها عرض واحد على الأقل"],
    ["accepted", "قبل العميل عرضًا"],
  ] as const;
  const stages = labels.map(([key, label], index) => ({
    key,
    label,
    count: counts[index],
    fromStart: percent(counts[index], totalQuotes),
    fromPrevious: percent(counts[index], index === 0 ? totalQuotes : counts[index - 1]),
  }));

  const quoteCreatedAt = new Map(
    quotes.map((quote) => [quote.id, new Date(quote.created_at).getTime()])
  );
  const firstOfferAt = new Map<string, number>();
  for (const offer of relevantOffers) {
    const created = new Date(offer.created_at).getTime();
    const current = firstOfferAt.get(offer.quote_id);
    if (Number.isFinite(created) && (current == null || created < current)) {
      firstOfferAt.set(offer.quote_id, created);
    }
  }
  const firstOfferHours: number[] = [];
  for (const [quoteId, offeredAt] of firstOfferAt) {
    const createdAt = quoteCreatedAt.get(quoteId);
    if (createdAt != null && offeredAt >= createdAt) {
      firstOfferHours.push((offeredAt - createdAt) / 3_600_000);
    }
  }
  const firstOfferMedian = median(firstOfferHours);

  const dailyMap = new Map<
    string,
    { date: string; quotes: number; offers: number; accepted: number }
  >();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - offset);
    const key = date.toISOString().slice(0, 10);
    dailyMap.set(key, { date: key, quotes: 0, offers: 0, accepted: 0 });
  }
  for (const quote of quotes) {
    const item = dailyMap.get(quote.created_at.slice(0, 10));
    if (item) item.quotes += 1;
  }
  for (const offer of relevantOffers) {
    const item = dailyMap.get(offer.created_at.slice(0, 10));
    if (item) item.offers += 1;
    if (offer.accepted_at) {
      const acceptedItem = dailyMap.get(offer.accepted_at.slice(0, 10));
      if (acceptedItem) acceptedItem.accepted += 1;
    }
  }

  return {
    days,
    generatedAt: now.toISOString(),
    stages,
    totalOffers: relevantOffers.length,
    medianFirstOfferHours:
      firstOfferMedian == null ? null : Math.round(firstOfferMedian * 10) / 10,
    daily: [...dailyMap.values()],
    sources: breakdown(countBy(quotes, (quote) => quote.source), totalQuotes),
    services: breakdown(countBy(quotes, (quote) => quote.service), totalQuotes).slice(0, 8),
  };
}

async function fetchAnalyticsQuotes(since: string): Promise<AnalyticsQuote[]> {
  const admin = getSupabaseAdmin();
  const pageSize = 1000;
  const rows: AnalyticsQuote[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from("quotes")
      .select("id,created_at,status,source,service")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as AnalyticsQuote[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

async function fetchAnalyticsOffers(since: string): Promise<AnalyticsOffer[]> {
  const admin = getSupabaseAdmin();
  const pageSize = 1000;
  const rows: AnalyticsOffer[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from("quote_offers")
      .select("id,quote_id,status,created_at,accepted_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as AnalyticsOffer[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

export async function fetchConversionAnalytics(
  days: AnalyticsRange,
  now = new Date()
): Promise<ConversionAnalytics> {
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - days + 1);
  since.setUTCHours(0, 0, 0, 0);
  const [quotes, offers] = await Promise.all([
    fetchAnalyticsQuotes(since.toISOString()),
    fetchAnalyticsOffers(since.toISOString()),
  ]);
  return buildConversionAnalytics(quotes, offers, days, now);
}
