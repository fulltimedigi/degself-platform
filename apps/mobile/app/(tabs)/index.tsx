import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Screen, Surface, ThemedText } from "@/components/primitives";
import { WorkshopCard } from "@/components/workshops/WorkshopCard";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme/theme-context";
import { fetchWorkshops } from "@/lib/workshops/api";
import type { Workshop } from "@/lib/workshops/types";
import { useFavorites } from "@/lib/favorites/favorites-context";
import { tokens } from "@/theme/tokens";
import { WEB_URL } from "@/shell/config";

const ACTIONS = {
  ar: { ask: "اسأل دق سلف", quote: "اطلب عرض سعر", emergency: "الطوارئ", calc: "حاسبة الأسعار" },
  en: { ask: "Ask degself", quote: "Request a quote", emergency: "Emergency", calc: "Price calculator" },
} as const;

type Action = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; tone?: "primary" | "danger" };

export default function HomeScreen() {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const a = ACTIONS[locale === "ar" ? "ar" : "en"];
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

  const openWeb = (path: string) =>
    router.push({ pathname: "/web", params: { url: `${WEB_URL}${path}` } });

  const actions: Action[] = [
    { key: "ask", label: a.ask, icon: "sparkles", onPress: () => openWeb("/ar/isal-degself"), tone: "primary" },
    { key: "quote", label: a.quote, icon: "camera", onPress: () => router.push("/quote") },
    { key: "emergency", label: a.emergency, icon: "warning", onPress: () => router.push("/(tabs)/emergency"), tone: "danger" },
    { key: "calc", label: a.calc, icon: "calculator", onPress: () => openWeb("/ar/asaar") },
  ];

  return (
    <Screen>
      <FlatList
        style={styles.list}
        data={workshops}
        keyExtractor={(item) => item.place_id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topRow}>
              <ThemedText size="xxl" bold style={{ flex: 1 }}>{t.appName}</ThemedText>
              <Pressable
                accessibilityLabel={t.tabs.account}
                hitSlop={10}
                onPress={() => router.push("/(tabs)/account")}
                style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Ionicons name="person-circle-outline" size={26} color={colors.foreground} />
              </Pressable>
            </View>
            <ThemedText muted>{t.workshops.homeIntro}</ThemedText>

            <View style={styles.grid}>
              {actions.map((act) => (
                <Pressable
                  key={act.key}
                  onPress={act.onPress}
                  style={({ pressed }) => [
                    styles.tile,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View
                    style={[
                      styles.tileIcon,
                      { backgroundColor: act.tone === "danger" ? "rgba(228,121,92,0.15)" : "rgba(255,214,10,0.15)" },
                    ]}
                  >
                    <Ionicons
                      name={act.icon}
                      size={24}
                      color={act.tone === "danger" ? colors.danger : colors.primary}
                    />
                  </View>
                  <ThemedText bold size="sm" style={{ textAlign: "center" }}>{act.label}</ThemedText>
                </Pressable>
              ))}
            </View>

            <Button label={t.workshops.searchAction} icon="search" onPress={() => router.push("/(tabs)/search")} />
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
  topRow: { flexDirection: "row", alignItems: "center", gap: tokens.space.sm },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center", justifyContent: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: tokens.space.sm },
  tile: {
    width: "48%",
    flexGrow: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.space.lg,
    paddingHorizontal: tokens.space.md,
    alignItems: "center",
    gap: tokens.space.sm,
  },
  tileIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  separator: { height: tokens.space.md },
});
