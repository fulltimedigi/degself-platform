import { API_BASE_URL } from "@/config/env";
import { normalizeDeleteResponse, type DeleteAccountResult } from "./account-deletion";

const DELETE_TIMEOUT_MS = 15_000;

// Native account-deletion transport: POST the canonical web operation with the
// Supabase access token as a Bearer credential. Identity is derived server-side
// from the verified token only; no user id, role, or email is sent by the app.
export async function requestAccountDeletion(
  accessToken: string,
  confirmation: string
): Promise<DeleteAccountResult> {
  if (!API_BASE_URL) return { ok: false, code: "SERVER_ERROR" };
  if (!accessToken) return { ok: false, code: "NOT_AUTHENTICATED" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DELETE_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/account/delete`, {
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
    /* non-JSON body → SERVER_ERROR */
  }
  return normalizeDeleteResponse(res.ok, body);
}
