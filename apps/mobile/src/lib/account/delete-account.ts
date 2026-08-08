import { API_BASE_URL } from "@/config/env";
import { normalizeDeleteResponse, type DeleteAccountResult } from "./account-deletion";

// Native account-deletion transport: POST the canonical web operation with the
// Supabase access token as a Bearer credential. This carries NO cookie and no
// browser Origin — the server verifies the token with Supabase and runs the
// exact same canonical deletion sequence used by the web cookie path (shared
// recent-auth, typed confirmation, rate limit, admin/claimed blockers,
// auth.admin.deleteUser). We never send user_id, role, or email — identity is
// derived server-side from the verified token only.

export async function requestAccountDeletion(
  accessToken: string,
  confirmation: string
): Promise<DeleteAccountResult> {
  if (!API_BASE_URL) return { ok: false, code: "SERVER_ERROR" };
  if (!accessToken) return { ok: false, code: "NOT_AUTHENTICATED" };

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/account/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ confirmation }),
    });
  } catch {
    // Network failure — surface as a generic server error for the UI.
    return { ok: false, code: "SERVER_ERROR" };
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body → normalizeDeleteResponse collapses to SERVER_ERROR */
  }
  return normalizeDeleteResponse(res.ok, body);
}
