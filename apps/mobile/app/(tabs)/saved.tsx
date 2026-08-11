import { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Surface, ThemedText } from "@/components/primitives";
import { WorkshopCard } from "@/components/workshops/WorkshopCard";
import { useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";
import { useAuth } from "@/lib/auth/auth-context";
import { useFavorites } from "@/lib/favorites/favorites-context";
import { fetchWorkshops } from "@/lib/workshops/api";
import type { Workshop } from "@/lib/workshops/types";

export default function SavedScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { status } = useAuth();
  const { favorites, loading: favoritesLoading, isFavorite, toggle } = useFavorites();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const signedIn = status === "signedIn";
  const idsKey = favorites.join("\u0000");

  useEffect(() => {
    const controller = new AbortController();
    if (favorites.length === 0) {
      setWorkshops([]);
      setLoading(false);
      setError(false);
      return () => controller.abort();
    }

    setLoading(true);
    setError(false);
    void fetchWorkshops({ ids: favorites }, controller.signal)
      .then((result) => setWorkshops(result.workshops))
      .catch((caught) => {
        if (!(caught instanceof Error && caught.name === "AbortError")) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [idsKey]);

  return (
    <Screen>
      <FlatList
        style={styles.list}
        data={workshops}
        keyExtractor={(item) => item.place_id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText size="xl" bold>
              {signedIn ? t.saved.authTitle : t.saved.guestTitle}
            </ThemedText>
            {!signedIn ? <ThemedText muted size="sm">{t.saved.guestBody}</ThemedText> : null}
            {favorites.length > 0 ? (
              <ThemedText muted size="sm">
                {t.saved.count.replace("%d", String(favorites.length))}
              </ThemedText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          favoritesLoading || loading ? (
            <Surface><ThemedText muted>{t.workshops.loading}</ThemedText></Surface>
          ) : error ? (
            <Surface><ThemedText>{t.workshops.loadError}</ThemedText></Surface>
          ) : (
            <Surface><ThemedText muted>{t.saved.empty}</ThemedText></Surface>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <WorkshopCard
            workshop={item}
            saved={isFavorite(item.place_id)}
            onToggleSaved={() => void toggle(item.place_id)}
            onOpen={() => router.push({ pathname: "/workshop/[placeId]", params: { placeId: item.place_id } })}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingBottom: tokens.space.xl },
  header: { gap: tokens.space.sm, marginBottom: tokens.space.md },
  separator: { height: tokens.space.md },
});
