// Expo push-token helpers shared by the register endpoint and (later) the admin
// send flow. Pure validation/parsing + a thin sender over the Expo push API.

export type PushPlatform = "ios" | "android" | "web";

export interface PushRegistration {
  token: string;
  platform: PushPlatform;
}

// Expo tokens look like `ExponentPushToken[xxxx…]` (or the newer `ExpoPushToken[…]`).
const EXPO_TOKEN_RE = /^Expo(?:nent)?PushToken\[[A-Za-z0-9._-]+\]$/;

export function isValidExpoPushToken(token: unknown): token is string {
  return typeof token === "string" && EXPO_TOKEN_RE.test(token);
}

export function normalizePlatform(platform: unknown): PushPlatform | null {
  if (platform === "ios" || platform === "android" || platform === "web") {
    return platform;
  }
  return null;
}

/**
 * Validate the JSON body of a register request. Returns a clean
 * { token, platform } or null when anything is off — the endpoint turns null
 * into a 400 without touching the database.
 */
export function parseRegisterBody(body: unknown): PushRegistration | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (!isValidExpoPushToken(record.token)) return null;
  const platform = normalizePlatform(record.platform);
  if (!platform) return null;
  return { token: record.token, platform };
}

// --- Expo push sender (used by admin send flows; safe to import anywhere) -----

export const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
// Expo accepts at most 100 messages per request.
export const EXPO_PUSH_CHUNK_SIZE = 100;

export interface ExpoPushMessage {
  to: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
}

export function chunkPushMessages(
  messages: ExpoPushMessage[],
  size: number = EXPO_PUSH_CHUNK_SIZE,
): ExpoPushMessage[][] {
  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += size) {
    chunks.push(messages.slice(i, i + size));
  }
  return chunks;
}

/**
 * Send a batch of push messages through the Expo push service, chunked to the
 * 100-per-request limit. Returns the concatenated ticket array. Network/HTTP
 * errors propagate to the caller.
 */
export async function sendExpoPush(
  messages: ExpoPushMessage[],
  fetchImpl: typeof fetch = fetch,
): Promise<unknown[]> {
  const tickets: unknown[] = [];
  for (const chunk of chunkPushMessages(messages)) {
    const res = await fetchImpl(EXPO_PUSH_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      throw new Error(`Expo push send failed: ${res.status}`);
    }
    const json = (await res.json()) as { data?: unknown[] };
    if (Array.isArray(json.data)) tickets.push(...json.data);
  }
  return tickets;
}
