import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { dispatchQuoteDeliveryQueue } from "@/lib/quote-delivery";
import {
  enqueueNetworkQuoteTargets,
  RFQ_ROUTING_WINDOW_MINUTES,
  RFQ_TARGET_OFFERS,
  RFQ_WAVE2_AFTER_MINUTES,
  RFQ_WAVE3_AFTER_MINUTES,
  RFQ_WAVE_LIMITS,
  type RfqRoutingWave,
} from "@/lib/network-quote-routing";

type ActiveQuote = {
  id: string;
  created_at: string;
  expires_at: string;
  service: string;
  area: string | null;
  status: string;
};

type QueueSnapshot = {
  workshop_id: string;
  routing_wave: number | null;
  status: string;
};

export type RfqWaveRunSummary = {
  inspected: number;
  expandedWave2: number;
  expandedWave3: number;
  stoppedAtTarget: number;
  dispatchedQuotes: number;
};

function ageMinutes(createdAt: string, nowMs: number): number {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (nowMs - created) / 60_000);
}

async function cancelPendingForSatisfiedQuote(quoteId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("quote_delivery_queue")
    .update({
      status: "cancelled",
      last_error: "RFQ target offer count reached; later private outreach cancelled",
      updated_at: now,
    })
    .eq("quote_id", quoteId)
    .eq("status", "queued");
  if (error) throw new Error(`pending RFQ cancellation failed: ${error.message}`);
}

async function countOffers(quoteId: string): Promise<number> {
  const admin = getSupabaseAdmin();
  const { count, error } = await admin
    .from("quote_offers")
    .select("id", { count: "exact", head: true })
    .eq("quote_id", quoteId);
  if (error) throw new Error(`offer count failed: ${error.message}`);
  return count ?? 0;
}

async function queueSnapshot(quoteId: string): Promise<QueueSnapshot[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("quote_delivery_queue")
    .select("workshop_id,routing_wave,status")
    .eq("quote_id", quoteId);
  if (error) throw new Error(`RFQ queue snapshot failed: ${error.message}`);
  return (data ?? []) as QueueSnapshot[];
}

async function enqueueWave(quote: ActiveQuote, wave: RfqRoutingWave, excluded: string[]): Promise<number> {
  const targets = await enqueueNetworkQuoteTargets({
    quoteId: quote.id,
    service: quote.service,
    area: quote.area,
    wave,
    excludePlaceIds: excluded,
    limit: RFQ_WAVE_LIMITS[wave],
  });
  return targets.length;
}

/**
 * Advances recent, still-actionable quotes through private 1:1 RFQ waves.
 *
 * Wave 1 is inserted synchronously when the quote is created.
 * Wave 2 becomes eligible after 15 minutes when fewer than 3 offers exist.
 * Wave 3 becomes eligible after 30 minutes under the same condition.
 *
 * This function never bypasses the WhatsApp kill switch: the downstream dispatcher
 * is still hard-gated by WHATSAPP_ENABLED and the approved garage RFQ template.
 */
export async function advanceRfqRoutingWaves(now = new Date()): Promise<RfqWaveRunSummary> {
  const admin = getSupabaseAdmin();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const recentSince = new Date(nowMs - RFQ_ROUTING_WINDOW_MINUTES * 60_000).toISOString();

  const { data, error } = await admin
    .from("quotes")
    .select("id,created_at,expires_at,service,area,status")
    .gte("created_at", recentSince)
    .gt("expires_at", nowIso)
    .in("status", ["new", "forwarded", "awaiting_offers"])
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(`active RFQ scan failed: ${error.message}`);

  const summary: RfqWaveRunSummary = {
    inspected: 0,
    expandedWave2: 0,
    expandedWave3: 0,
    stoppedAtTarget: 0,
    dispatchedQuotes: 0,
  };

  for (const raw of data ?? []) {
    const quote = raw as ActiveQuote;
    summary.inspected += 1;

    try {
      const offers = await countOffers(quote.id);
      if (offers >= RFQ_TARGET_OFFERS) {
        await cancelPendingForSatisfiedQuote(quote.id);
        summary.stoppedAtTarget += 1;
        continue;
      }

      const age = ageMinutes(quote.created_at, nowMs);
      let queue = await queueSnapshot(quote.id);
      const excluded = new Set(queue.map((row) => row.workshop_id));
      const hasWave2 = queue.some((row) => Number(row.routing_wave ?? 1) >= 2);
      const hasWave3 = queue.some((row) => Number(row.routing_wave ?? 1) >= 3);

      if (age >= RFQ_WAVE2_AFTER_MINUTES && !hasWave2) {
        const added = await enqueueWave(quote, 2, Array.from(excluded));
        if (added > 0) {
          summary.expandedWave2 += 1;
          queue = await queueSnapshot(quote.id);
          for (const row of queue) excluded.add(row.workshop_id);
        }
      }

      // Re-check offers before the broadest safety net so a concurrent garage
      // response can stop unnecessary outreach between Wave 2 and Wave 3.
      const offersBeforeWave3 = await countOffers(quote.id);
      if (offersBeforeWave3 >= RFQ_TARGET_OFFERS) {
        await cancelPendingForSatisfiedQuote(quote.id);
        summary.stoppedAtTarget += 1;
        continue;
      }

      if (age >= RFQ_WAVE3_AFTER_MINUTES && !hasWave3) {
        const added = await enqueueWave(quote, 3, Array.from(excluded));
        if (added > 0) summary.expandedWave3 += 1;
      }

      await dispatchQuoteDeliveryQueue(quote.id);
      summary.dispatchedQuotes += 1;
    } catch (e) {
      // One damaged quote must never block the rest of the marketplace scheduler.
      console.error(`RFQ wave orchestration failed for quote ${quote.id}:`, e);
    }
  }

  return summary;
}
