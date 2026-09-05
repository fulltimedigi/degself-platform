import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Screen, Surface, ThemedText } from "@/components/primitives";
import { WorkshopCard } from "@/components/workshops/WorkshopCard";
import { useI18n } from "@/i18n";
import { quoteCopy } from "@/features/quote/copy";
import { fetchWorkshops } from "@/lib/workshops/api";
import type { Workshop } from "@/lib/workshops/types";
import { useFavorites } from "@/lib/favorites/favorites-context";
import { tokens } from "@/theme/tokens";

export default function HomeScreen() {
  const { t, locale } = useI18n();
  const qc = quoteCopy(locale);
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load(signal?: AbortSignal) {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchWorkshops({ limit: 12 }, signal);
      setWorkshops(result.workshops);
    } catch (caught) {
      if (!(caught instanceof Error && caught.name === "AbortError")) setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  return (
    <Screen>
      <FlatList
        style={styles.list}
        data={workshops}
        keyExtractor={(item) => item.place_id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading && workshops.length > 0} onRefresh={() => void load()} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText size="xxl" bold>{t.appName}</ThemedText>
            <ThemedText muted>{t.workshops.homeIntro}</ThemedText>
            <View style={styles.quoteCta}>
              <ThemedText size="lg" bold>{qc.title}</ThemedText>
              <ThemedText muted size="sm">{qc.subtitle}</ThemedText>
              <Button label={qc.submit} onPress={() => router.push("/(tabs)/quote")} />
            </View>
            <Button label={t.workshops.searchAction} variant="secondary" onPress={() => router.push("/(tabs)/search")} />
            <ThemedText size="lg" bold>{t.workshops.featured}</ThemedText>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Surface><ThemedText muted>{t.workshops.loading}</ThemedText></Surface>
          ) : error ? (
            <Surface>
              <ThemedText>{t.workshops.loadError}</ThemedText>
              <Button label={t.workshops.retry} variant="secondary" onPress={() => void load()} />
            </Surface>
          ) : (
            <Surface><ThemedText muted>{t.workshops.empty}</ThemedText></Surface>
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
  header: { gap: tokens.space.md, marginBottom: tokens.space.md },
  quoteCta: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.primary,
    borderWidth: 1.5,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    gap: tokens.space.sm,
  },
  separator: { height: tokens.space.md },
});
