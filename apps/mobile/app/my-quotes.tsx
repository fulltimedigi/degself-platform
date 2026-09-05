import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Screen, Surface, ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";
import { useTheme } from "@/theme/theme-context";
import { settingsCopy } from "@/features/settings/copy";
import {
  clearQuoteHistory,
  listQuoteHistory,
  type QuoteRecord,
} from "@/lib/prefs/quote-history";

function formatDate(ms: number, locale: string): string {
  try {
    return new Date(ms).toLocaleDateString(locale === "ar" ? "ar-KW" : locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    const d = new Date(ms);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }
}

export default function MyQuotesScreen() {
  const { t, locale, dir } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const c = useMemo(() => settingsCopy(locale), [locale]);
  const [items, setItems] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void listQuoteHistory().then((rows) => {
      if (mounted) {
        setItems(rows);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function onClear() {
    await clearQuoteHistory();
    setItems([]);
  }

  return (
    <Screen>
      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(item, i) => `${item.id ?? "local"}-${item.createdAt}-${i}`}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.workshops.back}
              onPress={() => router.back()}
              hitSlop={10}
              style={[styles.backRow, { flexDirection: dir === "rtl" ? "row-reverse" : "row" }]}
            >
              <Ionicons name={dir === "rtl" ? "chevron-forward" : "chevron-back"} size={22} color={colors.foreground} />
              <ThemedText size="sm">{t.workshops.back}</ThemedText>
            </Pressable>
            <ThemedText size="xl" bold>{c.myQuotesTitle}</ThemedText>
            <ThemedText muted size="sm">{c.myQuotesNote}</ThemedText>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Surface><ThemedText muted>…</ThemedText></Surface>
          ) : (
            <Surface><ThemedText muted>{c.myQuotesEmpty}</ThemedText></Surface>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Surface>
            <View style={[styles.rowTop, { flexDirection: dir === "rtl" ? "row-reverse" : "row" }]}>
              <ThemedText bold style={styles.flex}>{item.service}</ThemedText>
              <ThemedText muted size="sm">{formatDate(item.createdAt, locale)}</ThemedText>
            </View>
            {item.car ? <ThemedText muted size="sm">{item.car}</ThemedText> : null}
            <ThemedText muted size="sm">
              {[item.area, item.urgency].filter(Boolean).join(" · ")}
            </ThemedText>
          </Surface>
        )}
        ListFooterComponent={
          items.length > 0 ? (
            <View style={styles.footer}>
              <Button label={c.myQuotesClear} variant="secondary" icon="trash-outline" onPress={() => void onClear()} />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingBottom: tokens.space.xl },
  header: { gap: tokens.space.sm, marginBottom: tokens.space.md },
  backRow: { alignItems: "center", gap: tokens.space.xs, alignSelf: "flex-start" },
  rowTop: { alignItems: "center", gap: tokens.space.sm },
  flex: { flex: 1 },
  separator: { height: tokens.space.md },
  footer: { marginTop: tokens.space.lg },
});
