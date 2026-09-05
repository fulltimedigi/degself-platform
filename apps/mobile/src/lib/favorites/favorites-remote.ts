import { getSupabase } from "@/lib/supabase";
import { dedupePreserveCase } from "./favorites-sync";

// Authenticated favorites go DIRECTLY to Supabase through the user's session +
// RLS — never a service-role API. The `.eq("user_id", uid)` filters here are for
// correct scoping/ordering; the actual authorization boundary is the RLS policy
// on public.user_favorites (select/insert/delete own rows only, migration 035).

const TABLE = "user_favorites";

/** This user's favorites, oldest-first (matches web ordering). */
export async function selectServerFavorites(uid: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select("place_id")
    .eq("user_id", uid)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return dedupePreserveCase(
    (data ?? []).map((r) => (r as { place_id: string }).place_id)
  );
}

/** Idempotent batched insert (composite PK makes replays no-ops). */
export async function insertServerFavorites(
  uid: string,
  placeIds: readonly string[]
): Promise<void> {
  if (placeIds.length === 0) return;
  const { error } = await getSupabase()
    .from(TABLE)
    .upsert(
      placeIds.map((place_id) => ({ user_id: uid, place_id })),
      { onConflict: "user_id,place_id", ignoreDuplicates: true }
    );
  if (error) throw error;
}

export async function addServerFavorite(uid: string, placeId: string): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLE)
    .upsert(
      { user_id: uid, place_id: placeId },
      { onConflict: "user_id,place_id", ignoreDuplicates: true }
    );
  if (error) throw error;
}

export async function removeServerFavorite(uid: string, placeId: string): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLE)
    .delete()
    .eq("user_id", uid)
    .eq("place_id", placeId);
  if (error) throw error;
}
