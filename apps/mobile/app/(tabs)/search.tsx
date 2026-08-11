import { useEffect, useState } from "react";
import { FlatList, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Screen, Surface, ThemedText } from "@/components/primitives";
import { WorkshopCard } from "@/components/workshops/WorkshopCard";
import { useI18n } from "@/i18n";
import { useFavorites } from "@/lib/favorites/favorites-context";
import { fetchWorkshops } from "@/lib/workshops/api";
import type { Workshop } from "@/lib/workshops/types";
import { tokens } from "@/theme/tokens";

export default function SearchScreen() {
  const { t, dir } = useI18n();
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const [query, setQuery] = useState("");
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const result = await fetchWorkshops({ query, limit: 24 }, controller.signal);
        setWorkshops(result.workshops);
      } catch (caught) {
        if (!(caught instanceof Error && caught.name === "AbortError")) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query.trim() ? 350 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, reloadKey]);

  return (
    <Screen>
      <FlatList
        style={styles.list}
        data={workshops}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.place_id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText size="xl" bold>{t.tabs.search}</ThemedText>
            <TextInput
              accessibilityLabel={t.workshops.searchPlaceholder}
              value={query}
              onChangeText={setQuery}
              placeholder={t.workshops.searchPlaceholder}
              placeholderTextColor={tokens.color.muted}
              returnKeyType="search"
              autoCorrect={false}
              maxLength={100}
              style={[styles.input, { textAlign: dir === "rtl" ? "right" : "left", writingDirection: dir }]}
            />
            {!loading && !error ? (
              <ThemedText muted size="sm">
                {t.workshops.resultCount.replace("%d", String(workshops.length))}
              </ThemedText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Surface><ThemedText muted>{t.workshops.loading}</ThemedText></Surface>
          ) : error ? (
            <Surface>
              <ThemedText>{t.workshops.loadError}</ThemedText>
              <Button label={t.workshops.retry} variant="secondary" onPress={() => setReloadKey((value) => value + 1)} />
            </Surface>
          ) : (
            <Surface><ThemedText muted>{t.workshops.noResults}</ThemedText></Surface>
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
  input: {
    minHeight: 50,
    borderRadius: tokens.radius.md,
    borderColor: tokens.color.border,
    borderWidth: 1,
    backgroundColor: tokens.color.surface,
    color: tokens.color.foreground,
    paddingHorizontal: tokens.space.md,
    fontSize: tokens.font.md,
  },
  separator: { height: tokens.space.md },
});
