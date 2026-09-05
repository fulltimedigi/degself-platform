import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Screen, Surface, ThemedText } from "@/components/primitives";
import { WorkshopCard } from "@/components/workshops/WorkshopCard";
import { useI18n } from "@/i18n";
import { useFavorites } from "@/lib/favorites/favorites-context";
import { fetchWorkshops } from "@/lib/workshops/api";
import {
  canRequestNextPage,
  displayCount,
  mergePage,
  reachedEnd,
} from "@/lib/workshops/search-pagination";
import type { Workshop } from "@/lib/workshops/types";
import { tokens } from "@/theme/tokens";
import type { Palette } from "@/theme/palettes";
import { useTheme } from "@/theme/theme-context";
import { useMemo } from "react";

const PAGE_SIZE = 24;

export default function SearchScreen() {
  const { t, dir } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [atEnd, setAtEnd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [pageError, setPageError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const pageRequestId = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const normalized = query.trim();
    const requestId = ++pageRequestId.current;
    loadingMoreRef.current = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      setLoadingMore(false);
      setError(false);
      setPageError(false);
      try {
        const result = await fetchWorkshops(
          { query: normalized, limit: PAGE_SIZE, offset: 0 },
          controller.signal
        );
        if (requestId !== pageRequestId.current) return; // stale query response
        const serverTotal = result.total ?? null;
        setActiveQuery(normalized);
        setWorkshops(result.workshops);
        setTotal(serverTotal);
        setAtEnd(
          reachedEnd(
            result.workshops.length,
            serverTotal,
            result.workshops.length,
            PAGE_SIZE
          )
        );
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
      !canRequestNextPage({
        initialLoading: loading,
        loadingMore: loadingMoreRef.current,
        hasError: error,
        pageError,
        queryMatchesActive: query.trim() === activeQuery,
        atEnd,
      })
    ) {
      return;
    }

    const requestId = pageRequestId.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setPageError(false);
    try {
      const result = await fetchWorkshops({
        query: activeQuery,
        limit: PAGE_SIZE,
        offset: workshops.length,
      });
      if (requestId !== pageRequestId.current) return; // stale query response
      const serverTotal = result.total ?? total;
      setWorkshops((current) => {
        const merged = mergePage(current, result.workshops);
        // Stop if the total/short-page says so, OR if a page added nothing new
        // (e.g. paging past the server's offset clamp returns duplicate rows) —
        // so the clamp tail can't drive endless empty "load more" requests.
        const noProgress = merged.length === current.length;
        setAtEnd(
          noProgress ||
            reachedEnd(merged.length, serverTotal, result.workshops.length, PAGE_SIZE)
        );
        return merged;
      });
      setTotal(serverTotal);
    } catch {
      // Preserve already-loaded results and surface an explicit, retryable error
      // footer instead of silently stalling mid-list.
      if (requestId === pageRequestId.current) setPageError(true);
    } finally {
      if (requestId === pageRequestId.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
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
              placeholderTextColor={colors.muted}
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
                {t.workshops.resultCount.replace(
                  "%d",
                  String(displayCount(total, workshops.length))
                )}
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
          ) : pageError ? (
            <View style={styles.footer}>
              <ThemedText size="sm">{t.workshops.loadError}</ThemedText>
              <Button
                label={t.workshops.retry}
                variant="secondary"
                onPress={() => void loadMore()}
              />
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

function makeStyles(c: Palette) {
  return StyleSheet.create({
    list: { flex: 1 },
    content: { paddingBottom: tokens.space.xl },
    header: { gap: tokens.space.md, marginBottom: tokens.space.md },
    input: {
      minHeight: 50,
      borderRadius: tokens.radius.md,
      borderColor: c.border,
      borderWidth: 1,
      backgroundColor: c.surface,
      color: c.foreground,
      paddingHorizontal: tokens.space.md,
      fontSize: tokens.font.md,
    },
    separator: { height: tokens.space.md },
    footer: { paddingVertical: tokens.space.md, alignItems: "center", gap: tokens.space.sm },
  });
}
