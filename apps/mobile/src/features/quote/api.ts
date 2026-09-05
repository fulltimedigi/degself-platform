import { API_BASE_URL } from "@/config/env";

export interface QuoteInput {
  customer_name: string;
  customer_phone: string;
  service: string;
  car_make: string;
  car_model: string;
  car_year: string;
  area: string;
  urgency: string;
  problem_description: string;
}

export class QuoteError extends Error {
  code: "rate" | "generic";
  constructor(code: "rate" | "generic", message: string) {
    super(message);
    this.code = code;
  }
}

// Submit an RFQ to the same endpoint the web quote bar uses. `source: "mobile"`
// lets the backend attribute mobile-originated requests (it falls back safely if
// the value isn't yet allow-listed server-side).
export async function submitQuote(input: QuoteInput): Promise<{ id: string | null }> {
  if (!API_BASE_URL) throw new QuoteError("generic", "Missing EXPO_PUBLIC_API_BASE_URL.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${API_BASE_URL}/api/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ...input, source: "mobile" }),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as { id?: string | null; error?: string } | null;
    if (!res.ok) {
      if (res.status === 429) throw new QuoteError("rate", data?.error ?? "");
      throw new QuoteError("generic", data?.error ?? "");
    }
    return { id: data?.id ?? null };
  } catch (e) {
    if (e instanceof QuoteError) throw e;
    throw new QuoteError("generic", "network");
  } finally {
    clearTimeout(timeout);
  }
}
