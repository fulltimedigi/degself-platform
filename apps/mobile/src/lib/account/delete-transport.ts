// Pure, injectable account-deletion transport. Split from delete-account.ts
// (which reads expo-constants config) so the destructive-request semantics —
// finite timeout, clean abort, timeout→safe failure, success ONLY on a 2xx +
// {ok:true} — are unit-testable in Node with a fake fetch.
import { normalizeDeleteResponse, type DeleteAccountResult } from "./account-deletion";

export type DeletionTransportDeps = {
  fetchImpl: typeof fetch;
  baseUrl: string;
  timeoutMs: number;
};

/**
 * POST the canonical web deletion operation with the Supabase access token as a
 * Bearer credential. Identity is derived server-side from the verified token;
 * the app sends only the typed confirmation. Any transport failure (network,
 * abort/timeout, non-JSON body) maps to a safe failure result — never success.
 */
export async function performDeletionRequest(
  accessToken: string,
  confirmation: string,
  deps: DeletionTransportDeps
): Promise<DeleteAccountResult> {
  if (!deps.baseUrl) return { ok: false, code: "SERVER_ERROR" };
  if (!accessToken) return { ok: false, code: "NOT_AUTHENTICATED" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), deps.timeoutMs);
  let res: Response;
  try {
    res = await deps.fetchImpl(`${deps.baseUrl}/api/account/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ confirmation }),
      signal: controller.signal,
    });
  } catch {
    return { ok: false, code: "SERVER_ERROR" };
  } finally {
    clearTimeout(timeout);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body → SERVER_ERROR via normalizeDeleteResponse */
  }
  return normalizeDeleteResponse(res.ok, body);
}
