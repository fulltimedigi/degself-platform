import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { kuwaitWhatsAppDigits } from "@/lib/utils";
import {
  garageQuoteTemplateComponents,
  garageQuoteTemplateName,
  isWhatsAppEnabled,
  sendWhatsAppTemplate,
} from "@/lib/whatsapp";

type QueueRow = {
  id: string;
  quote_id: string;
  workshop_id: string;
  status: string;
  attempts: number;
  delivery_token: string;
};

type QuoteRow = {
  id: string;
  service: string;
  car_make: string | null;
  car_model: string | null;
  car_year: string | null;
  area: string | null;
};

type WorkshopRow = {
  place_id: string;
  phone: string | null;
  phone_intl: string | null;
};

type OutreachRow = {
  id: string;
  token: string;
  outreach_count: number;
};

function carLabel(q: QuoteRow): string {
  return [q.car_make, q.car_model, q.car_year].filter(Boolean).join(" ") || "غير محدد";
}

async function existingOutreach(quoteId: string, workshopId: string): Promise<OutreachRow | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("quote_workshop_outreach")
    .select("id,token,outreach_count")
    .eq("quote_id", quoteId)
    .eq("workshop_id", workshopId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as OutreachRow | null) ?? null;
}

/**
 * Turn a provider-confirmed delivery into the canonical measured outreach row.
 * Safe to retry: existing quote/workshop outreach is reused and the queue keeps
 * the canonical outreach_id. `sentAt` is the provider-acceptance timestamp.
 */
export async function materializeSentDeliveryOutreach(input: {
  queueId: string;
  quoteId: string;
  workshopId: string;
  token: string;
  sentAt: string;
}): Promise<string> {
  const admin = getSupabaseAdmin();
  let outreach = await existingOutreach(input.quoteId, input.workshopId);

  if (outreach) {
    const { data, error } = await admin
      .from("quote_workshop_outreach")
      .update({
        last_outreach_at: input.sentAt,
        outreach_count: Number(outreach.outreach_count ?? 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", outreach.id)
      .select("id,token,outreach_count")
      .single();
    if (error) throw new Error(error.message);
    outreach = data as OutreachRow;
  } else {
    const { data, error } = await admin
      .from("quote_workshop_outreach")
      .insert({
        quote_id: input.quoteId,
        workshop_id: input.workshopId,
        token: input.token,
        channel: "whatsapp",
        first_outreach_at: input.sentAt,
        last_outreach_at: input.sentAt,
        outreach_count: 1,
        created_at: input.sentAt,
        updated_at: input.sentAt,
      })
      .select("id,token,outreach_count")
      .single();

    if (error) {
      // A concurrent materializer may have won the unique quote/workshop race.
      outreach = await existingOutreach(input.quoteId, input.workshopId);
      if (!outreach) throw new Error(error.message);
    } else {
      outreach = data as OutreachRow;
    }
  }

  const { error: queueError } = await admin
    .from("quote_delivery_queue")
    .update({ outreach_id: outreach.id, updated_at: new Date().toISOString() })
    .eq("id", input.queueId)
    .eq("status", "sent");
  if (queueError) throw new Error(queueError.message);
  return outreach.id;
}

/** Fallback/reconciliation path for a clicked token whose send succeeded. */
export async function materializeSentDeliveryOutreachByToken(token: string): Promise<{
  outreachId: string;
  quoteId: string;
  workshopId: string;
} | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("quote_delivery_queue")
    .select("id,quote_id,workshop_id,delivery_token,sent_at,status,outreach_id")
    .eq("delivery_token", token)
    .eq("status", "sent")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !data.sent_at) return null;

  if (data.outreach_id) {
    return {
      outreachId: String(data.outreach_id),
      quoteId: String(data.quote_id),
      workshopId: String(data.workshop_id),
    };
  }

  const outreachId = await materializeSentDeliveryOutreach({
    queueId: String(data.id),
    quoteId: String(data.quote_id),
    workshopId: String(data.workshop_id),
    token: String(data.delivery_token),
    sentAt: String(data.sent_at),
  });
  return {
    outreachId,
    quoteId: String(data.quote_id),
    workshopId: String(data.workshop_id),
  };
}

async function processQueueRow(row: QueueRow): Promise<"sent" | "failed" | "skipped"> {
  const template = garageQuoteTemplateName();
  if (!isWhatsAppEnabled() || !template) return "skipped";

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Atomic claim: only one worker can move queued -> sending.
  const { data: claimed, error: claimError } = await admin
    .from("quote_delivery_queue")
    .update({
      status: "sending",
      attempts: Number(row.attempts ?? 0) + 1,
      last_attempt_at: now,
      last_error: null,
      updated_at: now,
    })
    .eq("id", row.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();
  if (claimError) throw new Error(claimError.message);
  if (!claimed) return "skipped";

  const [{ data: quote, error: quoteError }, { data: workshop, error: workshopError }] = await Promise.all([
    admin
      .from("quotes")
      .select("id,service,car_make,car_model,car_year,area")
      .eq("id", row.quote_id)
      .maybeSingle(),
    admin
      .from("workshops")
      .select("place_id,phone,phone_intl")
      .eq("place_id", row.workshop_id)
      .maybeSingle(),
  ]);

  if (quoteError || workshopError || !quote || !workshop) {
    const reason = quoteError?.message || workshopError?.message || "missing quote/workshop";
    await admin
      .from("quote_delivery_queue")
      .update({ status: "failed", last_error: reason.slice(0, 500), updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return "failed";
  }

  const recipient = kuwaitWhatsAppDigits(
    (workshop as WorkshopRow).phone_intl || (workshop as WorkshopRow).phone
  );
  if (!recipient) {
    await admin
      .from("quote_delivery_queue")
      .update({ status: "blocked_no_channel", last_error: "no WhatsApp-capable phone", updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return "failed";
  }

  // If a manual measured link already exists, reuse its token. Otherwise use the
  // reserved queue token; it is not resolvable until this provider send succeeds.
  const prior = await existingOutreach(row.quote_id, row.workshop_id);
  const token = prior?.token ?? row.delivery_token;
  const q = quote as QuoteRow;
  const result = await sendWhatsAppTemplate(
    recipient,
    template,
    garageQuoteTemplateComponents(q.service, carLabel(q), q.area ?? "غير محددة", token)
  );

  if (!result.ok) {
    if (result.skipped) {
      // Configuration changed after the pre-check; return to queued without
      // claiming a real provider attempt.
      await admin
        .from("quote_delivery_queue")
        .update({
          status: "queued",
          attempts: Number(row.attempts ?? 0),
          last_error: `provider skipped: ${result.reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      return "skipped";
    }
    await admin
      .from("quote_delivery_queue")
      .update({
        status: "failed",
        last_error: result.error.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    return "failed";
  }

  const sentAt = new Date().toISOString();
  const { error: sentError } = await admin
    .from("quote_delivery_queue")
    .update({
      status: "sent",
      provider_message_id: result.messageId,
      sent_at: sentAt,
      last_error: null,
      updated_at: sentAt,
    })
    .eq("id", row.id)
    .eq("status", "sending");
  if (sentError) {
    // Do NOT retry automatically: Meta accepted the message, so a retry could
    // duplicate it. The row stays sending and requires reconciliation.
    console.error("provider accepted delivery but queue finalization failed:", sentError);
    return "failed";
  }

  try {
    await materializeSentDeliveryOutreach({
      queueId: row.id,
      quoteId: row.quote_id,
      workshopId: row.workshop_id,
      token,
      sentAt,
    });
  } catch (e) {
    // The message is already sent. Keep status=sent; a later reconciliation or
    // first link open can materialize the missing measured outreach safely.
    console.error("sent delivery outreach materialization failed:", e);
  }
  return "sent";
}

export async function reconcileSentDeliveries(limit = 20): Promise<number> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("quote_delivery_queue")
    .select("id,quote_id,workshop_id,delivery_token,sent_at")
    .eq("status", "sent")
    .is("outreach_id", null)
    .not("sent_at", "is", null)
    .limit(limit);
  if (error) throw new Error(error.message);

  let repaired = 0;
  for (const row of data ?? []) {
    try {
      await materializeSentDeliveryOutreach({
        queueId: String(row.id),
        quoteId: String(row.quote_id),
        workshopId: String(row.workshop_id),
        token: String(row.delivery_token),
        sentAt: String(row.sent_at),
      });
      repaired += 1;
    } catch (e) {
      console.error("delivery reconciliation failed:", e);
    }
  }
  return repaired;
}

/** Dispatch all still-queued targets for one newly created quote, concurrently. */
export async function dispatchQuoteDeliveryQueue(quoteId: string): Promise<void> {
  if (!isWhatsAppEnabled() || !garageQuoteTemplateName()) return;
  await reconcileSentDeliveries(10);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("quote_delivery_queue")
    .select("id,quote_id,workshop_id,status,attempts,delivery_token")
    .eq("quote_id", quoteId)
    .eq("status", "queued")
    .order("target_rank", { ascending: true })
    .limit(5);
  if (error) throw new Error(error.message);

  await Promise.allSettled(((data ?? []) as QueueRow[]).map((row) => processQueueRow(row)));
}
