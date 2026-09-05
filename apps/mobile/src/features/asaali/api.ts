import { API_BASE_URL } from "@/config/env";

// Types mirror the subset of the web /api/asaali response the mobile screen
// renders. Kept self-contained (the web schema lives in the web app and is not
// importable across the app boundary). The server owns all validation and the
// LLM call; the app never sees a secret.
export type AsaaliStatus =
  | "ok"
  | "needs_more_info"
  | "needs_vehicle_info"
  | "out_of_scope"
  | "budget_exceeded"
  | "rate_limited";

export interface AsaaliWarning {
  severity: "safe" | "caution" | "urgent";
  message: string;
  action: string;
}

export interface AsaaliTerm {
  arabic: string;
  english: string;
  transliteration?: string;
}

export interface AsaaliWorkshop {
  id: string;
  name: string;
  area?: string;
  phone?: string;
  rating?: number;
  specialty?: string;
}

export interface AsaaliResponse {
  status: AsaaliStatus;
  problem_summary?: string;
  official_terms?: AsaaliTerm[];
  explanation?: string;
  warning?: AsaaliWarning;
  recommended_workshops?: AsaaliWorkshop[];
  whatsapp_message?: string;
  follow_up_question?: string;
  fallback_message?: string;
  retry_after_seconds?: number;
  category?: string | null;
  source?: string;
}

export interface AsaaliVehicle {
  make?: string;
  model?: string;
  year?: number;
}

export interface AskInput {
  text: string;
  vehicle?: AsaaliVehicle;
  /** User declined make/model — server must not loop on needs_vehicle_info. */
  vehicle_skipped?: boolean;
  locale: string;
  conversation_history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export class AsaaliError extends Error {}

// POST to the same endpoint the web assistant uses. The server returns a JSON
// body carrying `status` for BOTH success and soft failures (rate_limited,
// budget_exceeded, out_of_scope) — often with a non-2xx code — so we read the
// body regardless of res.ok and surface `status` to the UI, exactly like web.
export async function askAsaali(input: AskInput): Promise<AsaaliResponse> {
  if (!API_BASE_URL) throw new AsaaliError("Missing EXPO_PUBLIC_API_BASE_URL.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${API_BASE_URL}/api/asaali`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as AsaaliResponse | null;
    if (!data || typeof data.status !== "string") {
      throw new AsaaliError("bad-response");
    }
    return data;
  } catch (e) {
    if (e instanceof AsaaliError) throw e;
    throw new AsaaliError("network");
  } finally {
    clearTimeout(timeout);
  }
}
