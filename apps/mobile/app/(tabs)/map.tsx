import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button, Screen, Surface, ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme/theme-context";
import { tokens } from "@/theme/tokens";
import { fetchWorkshops } from "@/lib/workshops/api";
import type { Workshop } from "@/lib/workshops/types";
import { haversineKm, formatKm } from "@/lib/geo";

// Kuwait City — the default region before we have a device fix.
const KUWAIT: Region = {
  latitude: 29.3759,
  longitude: 47.9774,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

// react-native-maps on iOS uses Apple MapKit (no API key). On Android it needs a
// Google Maps SDK key baked into the build; until we ship one we render a native,
// device-located garage list instead of a blank map — still a real, useful native
// surface (GPS distance sorting + one-tap directions), never a broken gray screen.
const USE_NATIVE_MAP = Platform.OS === "ios";

const COPY = {
  ar: {
    title: "الكراجات القريبة منك",
    intro: "رتّبنا الكراجات حسب قربها من موقعك.",
    enable: "حدّد موقعي",
    details: "التفاصيل",
    directions: "الاتجاهات",
    error: "تعذّر تحميل الكراجات، حاول تاني.",
    empty: "لا توجد كراجات لعرضها.",
  },
  en: {
    title: "Garages near you",
    intro: "Sorted by distance from your location.",
    enable: "Locate me",
    details: "Details",
    directions: "Directions",
    error: "Couldn't load garages, try again.",
    empty: "No garages to show.",
  },
} as const;

type MapCopy = { [K in keyof (typeof COPY)["ar"]]: string };

type Located = Workshop & { lat: number; lng: number };

function hasCoords(w: Workshop): w is Located {
  return typeof w.lat === "number" && typeof w.lng === "number";
}

// Platform-appropriate driving-directions deep link.
function driveUrl(w: Located): string {
  const label = encodeURIComponent(w.name);
  return Platform.OS === "android"
    ? `https://www.google.com/maps/dir/?api=1&destination=${w.lat},${w.lng}&destination_place_id=${label}`
    : `https://maps.apple.com/?daddr=${w.lat},${w.lng}&dirflg=d&q=${label}`;
}

export default function MapScreen() {
  const { t, locale, dir } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [workshops, setWorkshops] = useState<Located[]>([]);
  const [error, setError] = useState(false);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const c = COPY[locale === "ar" ? "ar" : "en"];

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetchWorkshops({ limit: 30 }, controller.signal);
        setWorkshops(res.workshops.filter(hasCoords));
      } catch (caught) {
        if (!(caught instanceof Error && caught.name === "AbortError")) setError(true);
      }
    })();
    return () => controller.abort();
  }, []);

  const locate = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setMe(coords);
      return coords;
    } catch {
      return null;
    }
  }, []);

  // ---- iOS: real Apple Maps ----
  const centerOnMe = useCallback(async () => {
    const coords = await locate();
    if (!coords) return;
    mapRef.current?.animateToRegion(
      { latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 },
      600
    );
  }, [locate]);

  if (USE_NATIVE_MAP) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={KUWAIT}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {workshops.map((w) => (
            <Marker
              key={w.place_id}
              coordinate={{ latitude: w.lat, longitude: w.lng }}
              title={w.name}
              description={[w.reviewed_specialty, w.area].filter(Boolean).join(" · ")}
              pinColor={w.emergency_service ? "#E4795C" : "#FFD60A"}
              onCalloutPress={() =>
                router.push({ pathname: "/workshop/[placeId]", params: { placeId: w.place_id } })
              }
            />
          ))}
        </MapView>

        {error ? (
          <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText muted size="sm">{t.workshops.loadError}</ThemedText>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c.enable}
          onPress={() => void centerOnMe()}
          style={({ pressed }) => [
            styles.locate,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="locate" size={22} color={colors.primaryForeground} />
        </Pressable>
      </View>
    );
  }

  // ---- Android: native distance-sorted list (no Google Maps key required) ----
  return <AndroidMapList {...{ c, dir, colors, workshops, error, me, locate, router }} />;
}

function AndroidMapList({
  c,
  dir,
  colors,
  workshops,
  error,
  me,
  locate,
  router,
}: {
  c: MapCopy;
  dir: "rtl" | "ltr";
  colors: ReturnType<typeof useTheme>["colors"];
  workshops: Located[];
  error: boolean;
  me: { lat: number; lng: number } | null;
  locate: () => Promise<{ lat: number; lng: number } | null>;
  router: ReturnType<typeof useRouter>;
}) {
  const sorted = useMemo(() => {
    if (!me) return workshops;
    return [...workshops].sort(
      (a, b) => haversineKm(me, { lat: a.lat, lng: a.lng }) - haversineKm(me, { lat: b.lat, lng: b.lng })
    );
  }, [workshops, me]);

  return (
    <Screen>
      <FlatList
        data={sorted}
        keyExtractor={(w) => w.place_id}
        contentContainerStyle={{ paddingBottom: tokens.space.xl }}
        ListHeaderComponent={
          <View style={{ gap: tokens.space.sm, marginBottom: tokens.space.md }}>
            <ThemedText size="xl" bold>{c.title}</ThemedText>
            <ThemedText muted size="sm">{c.intro}</ThemedText>
            <Button label={c.enable} icon="locate" variant="secondary" onPress={() => void locate()} />
          </View>
        }
        ListEmptyComponent={
          <Surface>
            <ThemedText muted>{error ? c.error : c.empty}</ThemedText>
          </Surface>
        }
        ItemSeparatorComponent={() => <View style={{ height: tokens.space.sm }} />}
        renderItem={({ item }) => {
          const km = me ? formatKm(haversineKm(me, { lat: item.lat, lng: item.lng })) : "";
          return (
            <Surface>
              <View style={{ flexDirection: dir === "rtl" ? "row-reverse" : "row", alignItems: "center", gap: tokens.space.sm }}>
                <View style={{ flex: 1 }}>
                  <ThemedText bold>{item.name}</ThemedText>
                  <ThemedText muted size="sm">
                    {[item.reviewed_specialty, item.area].filter(Boolean).join(" · ")}
                  </ThemedText>
                </View>
                {km ? (
                  <View style={[styles.km, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <ThemedText size="sm" bold>{km}</ThemedText>
                  </View>
                ) : null}
              </View>
              <View style={{ flexDirection: dir === "rtl" ? "row-reverse" : "row", gap: tokens.space.sm, marginTop: tokens.space.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={c.details}
                    variant="secondary"
                    onPress={() =>
                      router.push({ pathname: "/workshop/[placeId]", params: { placeId: item.place_id } })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={c.directions}
                    icon="navigate"
                    onPress={() => void Linking.openURL(driveUrl(item)).catch(() => {})}
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
  locate: {
    position: "absolute",
    bottom: 24,
    insetInlineEnd: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 },
    }),
  },
  km: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: 2,
  },
  banner: {
    position: "absolute",
    top: 12,
    insetInlineStart: 16,
    insetInlineEnd: 16,
    padding: tokens.space.sm,
    borderRadius: tokens.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
