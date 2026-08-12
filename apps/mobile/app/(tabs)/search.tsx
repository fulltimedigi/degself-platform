import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Screen, Surface, ThemedText } from "@/components/primitives";
import { WorkshopCard } from "@/components/workshops/WorkshopCard";
import { useI18n } from "@/i18n";
import { useFavorites } from "@/lib/favorites/favorites-context";
import { fetchWorkshops } from "@/lib/workshops/api";
import type { Workshop } from "@/lib/workshops/types";
import { tokens } from "@/theme/tokens";

const PAGE_SIZE = 24;

export default function SearchScreen() {
  const { t, dir } = useI18n();
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const pageRequestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const normalized = query.trim();
    const requestId = ++pageRequestId.current;

    const timer = setTimeout(async () => {
      setLoading(true);
      setLoadingMore(false);
      setError(false);
      try {
        const result = await fetchWorkshops(
          { query: normalized, limit: PAGE_SIZE, offset: 0 },
          controller.signal
        );
        if (requestId !== pageRequestId.current) return;
        setActiveQuery(normalized);
        setWorkshops(result.workshops);
        setTotal(result.total ?? result.workshops.length);
      } catch (caught) {
        if (
          requestId === pageRequestId.current &&
          !(caught instanceof Error && caught.name === "AbortError")
        ) {
          setError(true);
        }
      } finally {
        if (requestId === pageRequestId.current && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, normalized ? 350 : 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, reloadKey]);

  async function loadMore() {
    if (
      loading ||
      loadingMore ||
      error ||
      query.trim() !== activeQuery ||
      total == null ||
      workshops.length >= total
    ) {
      return;
    }

    const requestId = pageRequestId.current;
    setLoadingMore(true);
    try {
      const result = await fetchWorkshops({
        query: activeQuery,
        limit: PAGE_SIZE,
        offset: workshops.length,
      });
      if (requestId !== pageRequestId.current) return;
      setWorkshops((current) => {
        const seen = new Set(current.map((item) => item.place_id));
        return [
          ...current,
          ...result.workshops.filter((item) => !seen.has(item.place_id)),
        ];
      });
      setTotal(result.total ?? total);
    } catch {
      // Keep already-loaded results usable. A later scroll can retry this page.
    } finally {
      if (requestId === pageRequestId.current) setLoadingMore(false);
    }
  }

  return (
    <Screen>
      <FlatList
        style={styles.list}
        data={workshops}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.place_id}
        contentContainerStyle={styles.content}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText size="xl" bold>
              {t.tabs.search}
            </ThemedText>
            <TextInput
              accessibilityLabel={t.workshops.searchPlaceholder}
              value={query}
              onChangeText={setQuery}
              placeholder={t.workshops.searchPlaceholder}
              placeholderTextColor={tokens.color.muted}
              returnKeyType="search"
              autoCorrect={false}
              maxLength={100}
              style={[
                styles.input,
                {
                  textAlign: dir === "rtl" ? "right" : "left",
                  writingDirection: dir,
                },
              ]}
            />
            {!loading && !error && total != null ? (
              <ThemedText muted size="sm">
                {t.workshops.resultCount.replace("%d", String(total))}
              </ThemedText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Surface>
              <ThemedText muted>{t.workshops.loading}</ThemedText>
            </Surface>
          ) : error ? (
            <Surface>
              <ThemedText>{t.workshops.loadError}</ThemedText>
              <Button
                label={t.workshops.retry}
                variant="secondary"
                onPress={() => setReloadKey((value) => value + 1)}
              />
            </Surface>
          ) : (
            <Surface>
              <ThemedText muted>{t.workshops.noResults}</ThemedText>
            </Surface>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ThemedText muted size="sm">
                {t.workshops.loading}
              </ThemedText>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <WorkshopCard
            workshop={item}
            saved={isFavorite(item.place_id)}
            onToggleSaved={() => void toggle(item.place_id)}
            onOpen={() =>
              router.push({
                pathname: "/workshop/[placeId]",
                params: { placeId: item.place_id },
              })
            }
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
  footer: { paddingVertical: tokens.space.md, alignItems: "center" },
});
