import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Linking, Pressable, StyleSheet, View } from "react-native";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Button, Screen, Surface, ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme/theme-context";
import { tokens } from "@/theme/tokens";
import {
  EMERGENCY_SERVICES,
  emergencyCopy,
  type EmergencyServiceKey,
} from "@/features/emergency/copy";
import { fetchWorkshops } from "@/lib/workshops/api";
import { callUrl, whatsappUrl } from "@/lib/workshops/links";
import type { Workshop } from "@/lib/workshops/types";
import { directionsUrl, formatKm, haversineKm } from "@/lib/geo";

type Ranked = { workshop: Workshop; km: number | null };

function open(url: string | null) {
  if (url) Linking.openURL(url).catch(() => {});
}

export default function EmergencyScreen() {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const copy = emergencyCopy(locale);
  const [active, setActive] = useState<EmergencyServiceKey>("tow");
  const [rows, setRows] = useState<Ranked[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const coords = useRef<{ lat: number; lng: number } | null>(null);

  // Ask for location once; used to rank providers by real distance.
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        /* no location — list stays unsorted */
      }
    })();
  }, []);

  const load = useCallback(
    async (key: EmergencyServiceKey, signal?: AbortSignal) => {
      setLoading(true);
      setError(false);
      const svc = EMERGENCY_SERVICES.find((s) => s.key === key)!;
      try {
        const res = await fetchWorkshops(
          { serviceMode: svc.serviceMode, specialty: svc.specialty, limit: 30 },
          signal
        );
        const me = coords.current;
        const ranked: Ranked[] = res.workshops.map((w) => ({
          workshop: w,
          km:
            me && w.lat != null && w.lng != null
              ? haversineKm(me, { lat: w.lat, lng: w.lng })
              : null,
        }));
        ranked.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
        setRows(ranked);
      } catch (caught) {
        if (!(caught instanceof Error && caught.name === "AbortError")) setError(true);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(active, controller.signal);
    return () => controller.abort();
  }, [active, load]);

  const onCall = useCallback((w: Workshop) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    open(callUrl(w));
  }, []);

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.workshop.place_id}
        contentContainerStyle={{ paddingBottom: tokens.space.xl, gap: tokens.space.md }}
        ListHeaderComponent={
          <View style={{ gap: tokens.space.md, marginBottom: tokens.space.sm }}>
            <ThemedText size="xl" bold>{copy.title}</ThemedText>
            <ThemedText muted>{copy.subtitle}</ThemedText>
            <View style={styles.chips}>
              {EMERGENCY_SERVICES.map((s) => {
                const on = s.key === active;
                return (
                  <Pressable
                    key={s.key}
                    onPress={() => setActive(s.key)}
                    style={[
                      styles.chip,
                      { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary : "transparent" },
                    ]}
                  >
                    <ThemedText
                      size="sm"
                      bold
                      style={{ color: on ? colors.primaryForeground : colors.foreground }}
                    >
                      {copy.services[s.key].label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <ThemedText muted size="sm">{copy.services[active].tagline}</ThemedText>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Surface><ThemedText muted>{copy.loading}</ThemedText></Surface>
          ) : error ? (
            <Surface>
              <ThemedText>{copy.loadError}</ThemedText>
              <Button label={copy.retry} variant="secondary" onPress={() => void load(active)} />
            </Surface>
          ) : (
            <Surface><ThemedText muted>{copy.empty}</ThemedText></Surface>
          )
        }
        renderItem={({ item }) => {
          const w = item.workshop;
          const loc = [w.neighborhood, w.area, w.governorate].filter(Boolean).join(" · ");
          return (
            <Surface>
              <View style={styles.rowTop}>
                <ThemedText bold style={{ flex: 1 }}>{w.name}</ThemedText>
                {item.km != null ? (
                  <View style={[styles.km, { backgroundColor: colors.surfaceRaised }]}>
                    <Ionicons name="navigate" size={12} color={colors.primary} />
                    <ThemedText size="sm" bold>{formatKm(item.km)}</ThemedText>
                  </View>
                ) : null}
              </View>
              {loc ? <ThemedText muted size="sm">{loc}</ThemedText> : null}
              <View style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <Button label={t.workshops.call} icon="call" onPress={() => onCall(w)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={t.workshops.directions}
                    icon="navigate"
                    variant="secondary"
                    onPress={() =>
                      w.lat != null && w.lng != null
                        ? open(directionsUrl({ lat: w.lat, lng: w.lng }, w.name))
                        : undefined
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={t.workshops.whatsapp}
                    icon="logo-whatsapp"
                    variant="secondary"
                    onPress={() => open(whatsappUrl(w))}
                  />
                </View>
              </View>
            </Surface>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: tokens.space.sm },
  chip: {
    borderWidth: 1,
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: tokens.space.sm },
  km: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: tokens.radius.pill,
  },
  actions: { flexDirection: "row", gap: tokens.space.sm, marginTop: tokens.space.sm },
});
