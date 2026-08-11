import { useEffect, useState } from "react";
import { Alert, Image, Linking, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Screen, Surface, ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";
import { useFavorites } from "@/lib/favorites/favorites-context";
import { fetchWorkshop } from "@/lib/workshops/api";
import { callUrl, mapUrl, safeWebsiteUrl, whatsappUrl } from "@/lib/workshops/links";
import type { Workshop } from "@/lib/workshops/types";
import { tokens } from "@/theme/tokens";

export default function WorkshopDetailScreen() {
  const { placeId: rawPlaceId } = useLocalSearchParams<{ placeId?: string | string[] }>();
  const placeId = Array.isArray(rawPlaceId) ? rawPlaceId[0] : rawPlaceId;
  const router = useRouter();
  const { t, dir } = useI18n();
  const { isFavorite, toggle } = useFavorites();
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    if (!placeId) {
      setLoading(false);
      setError(true);
      return () => controller.abort();
    }
    void fetchWorkshop(placeId, controller.signal)
      .then(setWorkshop)
      .catch((caught) => {
        if (!(caught instanceof Error && caught.name === "AbortError")) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [placeId]);

  async function openUrl(url: string | null) {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t.workshops.linkError);
    }
  }

  if (loading) {
    return <Screen><Surface><ThemedText muted>{t.workshops.loading}</ThemedText></Surface></Screen>;
  }
  if (error || !workshop) {
    return (
      <Screen>
        <Surface>
          <ThemedText>{t.workshops.notFound}</ThemedText>
          <Button label={t.workshops.back} variant="secondary" onPress={() => router.back()} />
        </Surface>
      </Screen>
    );
  }

  const phone = callUrl(workshop);
  const whatsapp = whatsappUrl(workshop);
  const website = safeWebsiteUrl(workshop.website);
  const location = [workshop.address, workshop.neighborhood, workshop.area, workshop.governorate]
    .filter(Boolean)
    .join(" · ");

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Button label={t.workshops.back} variant="secondary" onPress={() => router.back()} />
        {workshop.main_image ? (
          <Image source={{ uri: workshop.main_image }} style={styles.hero} resizeMode="cover" />
        ) : null}
        <ThemedText size="xl" bold>{workshop.name}</ThemedText>
        {workshop.reviewed_specialty ? <ThemedText muted>{workshop.reviewed_specialty}</ThemedText> : null}

        <Surface>
          <View style={[styles.metaRow, { flexDirection: dir === "rtl" ? "row-reverse" : "row" }]}>
            {workshop.google_rating != null ? (
              <ThemedText>⭐ {workshop.google_rating.toFixed(1)} ({workshop.google_reviews_count ?? 0})</ThemedText>
            ) : null}
            {workshop.is_partner ? <ThemedText bold>{t.workshops.partner}</ThemedText> : null}
          </View>
          {location ? <ThemedText>{location}</ThemedText> : null}
          {workshop.opening_hours ? (
            <>
              <ThemedText bold>{t.workshops.hours}</ThemedText>
              <ThemedText muted size="sm">{workshop.opening_hours}</ThemedText>
            </>
          ) : null}
        </Surface>

        <Button
          label={isFavorite(workshop.place_id) ? t.workshops.removeSaved : t.workshops.save}
          variant="secondary"
          onPress={() => void toggle(workshop.place_id)}
        />
        <View style={[styles.actions, { flexDirection: dir === "rtl" ? "row-reverse" : "row" }]}>
          {phone ? <View style={styles.action}><Button label={t.workshops.call} onPress={() => void openUrl(phone)} /></View> : null}
          {whatsapp ? <View style={styles.action}><Button label={t.workshops.whatsapp} onPress={() => void openUrl(whatsapp)} /></View> : null}
        </View>
        <Button label={t.workshops.directions} variant="secondary" onPress={() => void openUrl(mapUrl(workshop))} />
        {website ? <Button label={t.workshops.website} variant="secondary" onPress={() => void openUrl(website)} /> : null}
        <ThemedText muted size="sm">{t.workshops.verifyDetails}</ThemedText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: tokens.space.md, paddingBottom: tokens.space.xl },
  hero: { width: "100%", height: 220, borderRadius: tokens.radius.lg, backgroundColor: tokens.color.border },
  metaRow: { flexWrap: "wrap", justifyContent: "space-between", gap: tokens.space.sm },
  actions: { gap: tokens.space.sm },
  action: { flex: 1 },
});
