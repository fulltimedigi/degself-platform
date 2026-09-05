import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Screen, Surface, ThemedText } from "@/components/primitives";
import { WorkshopCard } from "@/components/workshops/WorkshopCard";
import { useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";
import type { Palette } from "@/theme/palettes";
import { useTheme } from "@/theme/theme-context";
import { useFavorites } from "@/lib/favorites/favorites-context";
import { fetchWorkshops } from "@/lib/workshops/api";
import type { Workshop } from "@/lib/workshops/types";
import {
  EMERGENCY_SERVICES,
  emergencyCopy,
  type EmergencyServiceKey,
} from "@/features/emergency/copy";

// One meaningful Ionicon per roadside service (the outline set the rest of the
// app uses): a car being hauled, a wrench for a mobile mechanic, a wheel/disc
// for tyres.
const SERVICE_ICON: Record<EmergencyServiceKey, keyof typeof Ionicons.glyphMap> = {
  tow: "car-sport-outline",
  mobile: "construct-outline",
  tire: "disc-outline",
};

// The API caps a page at 30; emergency lists are short, so one page is plenty.
const EMERGENCY_LIMIT = 30;

function isServiceKey(value: unknown): value is EmergencyServiceKey {
  return EMERGENCY_SERVICES.some((s) => s.key === value);
}

export default function EmergencyScreen() {
  const { locale, dir } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const c = useMemo(() => emergencyCopy(locale), [locale]);
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const params = useLocalSearchParams<{ mode?: string }>();

  const [active, setActive] = useState<EmergencyServiceKey>(
    isServiceKey(params.mode) ? params.mode : "tow"
  );
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const service = useMemo(
    () => EMERGENCY_SERVICES.find((s) => s.key === active) ?? EMERGENCY_SERVICES[0],
    [active]
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    void fetchWorkshops(
      {
        serviceMode: service.serviceMode,
        specialty: service.specialty,
        limit: EMERGENCY_LIMIT,
      },
      controller.signal
    )
      .then((result) => {
        if (!controller.signal.aborted) setWorkshops(result.workshops);
      })
      .catch((caught) => {
        if (!(caught instanceof Error && caught.name === "AbortError")) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [service.serviceMode, service.specialty, reloadKey]);

  const rowDir = dir === "rtl" ? "row-reverse" : "row";

  return (
    <Screen>
      <FlatList
        style={styles.list}
        data={workshops}
        keyExtractor={(item) => item.place_id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.back}
              onPress={() => router.back()}
              hitSlop={10}
              style={[styles.backRow, { flexDirection: rowDir }]}
            >
              <Ionicons
                name={dir === "rtl" ? "chevron-forward" : "chevron-back"}
                size={22}
                color={colors.foreground}
              />
              <ThemedText size="sm">{c.back}</ThemedText>
            </Pressable>

            {/* Urgent hero */}
            <View style={[styles.badge, { flexDirection: rowDir }]}>
              <View style={styles.dot} />
              <ThemedText size="sm" bold style={{ color: colors.danger }}>
                {c.badge}
              </ThemedText>
            </View>
            <ThemedText size="xl" bold>
              {c.title}
            </ThemedText>
            <ThemedText muted size="sm">
              {c.subtitle}
            </ThemedText>

            {/* Service chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.chips, { flexDirection: rowDir }]}
            >
              {EMERGENCY_SERVICES.map((s) => {
                const selected = s.key === active;
                return (
                  <Pressable
                    key={s.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setActive(s.key)}
                    style={[
                      styles.chip,
                      { flexDirection: rowDir },
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={SERVICE_ICON[s.key]}
                      size={16}
                      color={selected ? colors.primaryForeground : colors.foreground}
                    />
                    <ThemedText
                      size="sm"
                      bold
                      style={{
                        color: selected ? colors.primaryForeground : colors.foreground,
                      }}
                    >
                      {c.services[s.key].label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.tagline, { flexDirection: rowDir }]}>
              <Ionicons name={SERVICE_ICON[active]} size={15} color={colors.muted} />
              <ThemedText muted size="sm">
                {c.services[active].tagline}
              </ThemedText>
            </View>

            {!loading && !error ? (
              <ThemedText muted size="sm">
                {c.resultCount.replace("%d", String(workshops.length))}
              </ThemedText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Surface>
              <ThemedText muted>{c.loading}</ThemedText>
            </Surface>
          ) : error ? (
            <Surface>
              <ThemedText>{c.loadError}</ThemedText>
              <Button
                label={c.retry}
                variant="secondary"
                onPress={() => setReloadKey((v) => v + 1)}
              />
            </Surface>
          ) : (
            <Surface>
              <ThemedText muted>{c.empty}</ThemedText>
            </Surface>
          )
        }
        ListFooterComponent={
          <Surface style={styles.tips}>
            <ThemedText bold>{c.tipsTitle}</ThemedText>
            {c.tips.map((tip, i) => (
              <View key={i} style={[styles.tipRow, { flexDirection: rowDir }]}>
                <Ionicons
                  name="ellipse"
                  size={6}
                  color={colors.primary}
                  style={styles.tipDot}
                />
                <ThemedText muted size="sm" style={styles.flex}>
                  {tip}
                </ThemedText>
              </View>
            ))}
          </Surface>
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
    header: { gap: tokens.space.sm, marginBottom: tokens.space.md },
    backRow: { alignItems: "center", gap: tokens.space.xs, alignSelf: "flex-start" },
    badge: {
      alignSelf: "flex-start",
      alignItems: "center",
      gap: tokens.space.xs,
      borderRadius: tokens.radius.pill,
      borderWidth: 1,
      borderColor: c.danger,
      paddingHorizontal: tokens.space.sm,
      paddingVertical: tokens.space.xs,
      marginTop: tokens.space.xs,
    },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.danger },
    chips: { gap: tokens.space.sm, paddingVertical: tokens.space.xs },
    chip: {
      alignItems: "center",
      gap: tokens.space.xs,
      borderRadius: tokens.radius.pill,
      borderWidth: 1,
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.sm,
    },
    tagline: { alignItems: "center", gap: tokens.space.xs },
    tips: { marginTop: tokens.space.md },
    tipRow: { alignItems: "flex-start", gap: tokens.space.sm },
    tipDot: { marginTop: 6 },
    flex: { flex: 1 },
    separator: { height: tokens.space.md },
  });
}
