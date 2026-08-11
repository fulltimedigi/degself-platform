import { Image, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";
import type { Workshop } from "@/lib/workshops/types";

export function WorkshopCard({
  workshop,
  saved,
  onOpen,
  onToggleSaved,
}: {
  workshop: Workshop;
  saved: boolean;
  onOpen: () => void;
  onToggleSaved: () => void;
}) {
  const { t, dir } = useI18n();
  const location = [workshop.neighborhood, workshop.area, workshop.governorate]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t.workshops.openDetails}: ${workshop.name}`}
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {workshop.main_image ? (
        <Image
          source={{ uri: workshop.main_image }}
          style={styles.image}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <ThemedText size="xl">🔧</ThemedText>
        </View>
      )}
      <View style={styles.body}>
        <View style={[styles.headingRow, { flexDirection: dir === "rtl" ? "row-reverse" : "row" }]}>
          <ThemedText bold style={styles.title} numberOfLines={2}>
            {workshop.name}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? t.workshops.removeSaved : t.workshops.save}
            accessibilityState={{ selected: saved }}
            hitSlop={10}
            onPress={(event) => {
              event.stopPropagation();
              onToggleSaved();
            }}
            style={styles.saveButton}
          >
            <ThemedText size="lg">{saved ? "★" : "☆"}</ThemedText>
          </Pressable>
        </View>
        {workshop.reviewed_specialty ? (
          <ThemedText muted size="sm" numberOfLines={1}>
            {workshop.reviewed_specialty}
          </ThemedText>
        ) : null}
        {location ? (
          <ThemedText muted size="sm" numberOfLines={1}>
            {location}
          </ThemedText>
        ) : null}
        <View style={[styles.meta, { flexDirection: dir === "rtl" ? "row-reverse" : "row" }]}>
          {workshop.google_rating != null ? (
            <ThemedText size="sm">
              ⭐ {workshop.google_rating.toFixed(1)}
              {workshop.google_reviews_count != null
                ? ` (${workshop.google_reviews_count})`
                : ""}
            </ThemedText>
          ) : null}
          {workshop.is_partner ? (
            <View style={styles.partnerBadge}>
              <ThemedText size="sm" style={styles.partnerText}>
                {t.workshops.partner}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
  },
  pressed: { opacity: 0.88 },
  image: { width: "100%", height: 150, backgroundColor: tokens.color.border },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  body: { padding: tokens.space.md, gap: tokens.space.xs },
  headingRow: { alignItems: "flex-start", gap: tokens.space.sm },
  title: { flex: 1 },
  saveButton: { minWidth: 36, minHeight: 36, alignItems: "center", justifyContent: "center" },
  meta: { alignItems: "center", flexWrap: "wrap", gap: tokens.space.sm, marginTop: tokens.space.xs },
  partnerBadge: {
    backgroundColor: tokens.color.primary,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  partnerText: { color: tokens.color.primaryForeground, fontWeight: "800" },
});
