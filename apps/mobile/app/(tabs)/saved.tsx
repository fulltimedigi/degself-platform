import { View } from "react-native";
import { Button, Screen, Surface, ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";
import { useAuth } from "@/lib/auth/auth-context";
import { useFavorites } from "@/lib/favorites/favorites-context";
import { isDev } from "@/config/env";

// Saved screen: guest favorites (AsyncStorage) vs authenticated favorites
// (Supabase + RLS), with the loss-safe guest→auth handoff handled by the store.
// M1 does NOT build workshop search — a dev-only fixture button adds controlled
// KNOWN real workshop place ids (user_favorites.place_id is FK-constrained to
// public.workshops) so favorites + the guest→auth handoff can be exercised
// without M2 search. Dev builds only.
const DEV_SAMPLE_IDS = [
  "ChIJ___P5P-Zzz8RwE6gPCgjJAg",
  "ChIJ__9P7h6ezz8R9fyYojDSmqI",
];

export default function SavedScreen() {
  const { t } = useI18n();
  const { status } = useAuth();
  const { favorites, loading, toggle } = useFavorites();
  const signedIn = status === "signedIn";

  function addSample() {
    const next = DEV_SAMPLE_IDS.find((id) => !favorites.includes(id));
    if (next) void toggle(next);
  }

  return (
    <Screen>
      <ThemedText size="xl" bold>
        {signedIn ? t.saved.authTitle : t.saved.guestTitle}
      </ThemedText>

      {!signedIn ? (
        <ThemedText muted size="sm">
          {t.saved.guestBody}
        </ThemedText>
      ) : null}

      <Surface>
        {loading ? (
          <ThemedText muted>…</ThemedText>
        ) : favorites.length === 0 ? (
          <ThemedText muted>{t.saved.empty}</ThemedText>
        ) : (
          <View style={{ gap: tokens.space.sm }}>
            <ThemedText muted size="sm">
              {t.saved.count.replace("%d", String(favorites.length))}
            </ThemedText>
            {favorites.map((id) => (
              <View
                key={id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: tokens.space.sm,
                }}
              >
                <ThemedText size="sm" style={{ flexShrink: 1 }}>
                  {id}
                </ThemedText>
                <Button
                  label={t.saved.remove}
                  variant="secondary"
                  onPress={() => void toggle(id)}
                />
              </View>
            ))}
          </View>
        )}
      </Surface>

      {isDev ? (
        <Button
          label={t.saved.devAddSample}
          variant="secondary"
          onPress={addSample}
        />
      ) : null}
    </Screen>
  );
}
