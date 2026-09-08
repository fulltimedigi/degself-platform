import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme/theme-context";
import { tokens } from "@/theme/tokens";
import { fetchWorkshops } from "@/lib/workshops/api";
import type { Workshop } from "@/lib/workshops/types";

// Kuwait City — the default region before we have a device fix.
const KUWAIT: Region = {
  latitude: 29.3759,
  longitude: 47.9774,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

function hasCoords(w: Workshop): w is Workshop & { lat: number; lng: number } {
  return typeof w.lat === "number" && typeof w.lng === "number";
}

export default function MapScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [error, setError] = useState(false);

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

  const centerOnMe = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion(
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        600
      );
    } catch {
      /* location unavailable — leave the map where it is */
    }
  }, []);

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
        {workshops.filter(hasCoords).map((w) => (
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
        accessibilityLabel={t.workshops.directions}
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
