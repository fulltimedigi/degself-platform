import { API_BASE_URL } from "@/config/env";
import type { DeleteAccountResult } from "./account-deletion";
import { performDeletionRequest } from "./delete-transport";

const DELETE_TIMEOUT_MS = 15_000;

// Native account-deletion transport: POST the canonical web operation with the
// Supabase access token as a Bearer credential. Identity is derived server-side
// from the verified token only; no user id, role, or email is sent by the app.
// The testable transport lives in ./delete-transport (injectable fetch/base/timeout).
export async function requestAccountDeletion(
  accessToken: string,
  confirmation: string
): Promise<DeleteAccountResult> {
  return performDeletionRequest(accessToken, confirmation, {
    fetchImpl: fetch,
    baseUrl: API_BASE_URL ?? "",
    timeoutMs: DELETE_TIMEOUT_MS,
  });
}
