import { useMemo } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";
import type { Palette } from "@/theme/palettes";
import { useTheme } from "@/theme/theme-context";
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
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const location = [workshop.neighborhood, workshop.area, workshop.governorate]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t.workshops.openDetails}: ${workshop.name}`}
      accessibilityActions={[
        { name: "toggleSave", label: saved ? t.workshops.removeSaved : t.workshops.save },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "toggleSave") onToggleSaved();
      }}
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
          <Ionicons name="construct-outline" size={34} color={colors.muted} />
        </View>
      )}
      <View style={styles.body}>
        <View style={[styles.headingRow, { flexDirection: dir === "rtl" ? "row-reverse" : "row" }]}>
          <ThemedText bold style={styles.title} numberOfLines={2}>
            {workshop.name}
          </ThemedText>
          <Pressable
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            hitSlop={10}
            onPress={(event) => {
              event.stopPropagation();
              onToggleSaved();
            }}
            style={styles.saveButton}
          >
            <Ionicons
              name={saved ? "heart" : "heart-outline"}
              size={22}
              color={saved ? colors.primary : colors.muted}
            />
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
            <View style={[styles.rating, { flexDirection: dir === "rtl" ? "row-reverse" : "row" }]}>
              <Ionicons name="star" size={13} color={colors.primary} />
              <ThemedText size="sm">
                {workshop.google_rating.toFixed(1)}
                {workshop.google_reviews_count != null
                  ? ` (${workshop.google_reviews_count})`
                  : ""}
              </ThemedText>
            </View>
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

function makeStyles(c: Palette) {
  return StyleSheet.create({
    card: {
      overflow: "hidden",
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: tokens.radius.lg,
    },
    pressed: { opacity: 0.88 },
    image: { width: "100%", height: 150, backgroundColor: c.border },
    imageFallback: { alignItems: "center", justifyContent: "center" },
    body: { padding: tokens.space.md, gap: tokens.space.xs },
    headingRow: { alignItems: "flex-start", gap: tokens.space.sm },
    title: { flex: 1 },
    saveButton: { minWidth: 36, minHeight: 36, alignItems: "center", justifyContent: "center" },
    meta: { alignItems: "center", flexWrap: "wrap", gap: tokens.space.sm, marginTop: tokens.space.xs },
    rating: { alignItems: "center", gap: 4 },
    partnerBadge: {
      backgroundColor: c.primary,
      borderRadius: tokens.radius.pill,
      paddingHorizontal: tokens.space.sm,
      paddingVertical: tokens.space.xs,
    },
    partnerText: { color: c.primaryForeground, fontWeight: "800" },
  });
}
