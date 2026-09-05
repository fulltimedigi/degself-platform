import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextProps,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "../theme/tokens";
import type { Palette } from "../theme/palettes";
import { useTheme } from "../theme/theme-context";
import { useI18n } from "../i18n";

// Owned, theme-aware primitives. Direction-aware text via the current locale's
// `dir` (RTL for ar/ur), and all colors resolved from the live theme so light
// and dark modes both render correctly.

export function Screen({ children, style, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }, style]} {...rest}>
      <View style={styles.screenInner}>{children}</View>
    </SafeAreaView>
  );
}

export function ThemedText({
  style,
  muted,
  size = "md",
  bold,
  ...rest
}: TextProps & { muted?: boolean; size?: keyof typeof tokens.font; bold?: boolean }) {
  const { dir } = useI18n();
  const { colors } = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          color: muted ? colors.muted : colors.foreground,
          fontSize: tokens.font[size],
          fontWeight: bold ? "800" : "400",
          writingDirection: dir,
          textAlign: dir === "rtl" ? "right" : "left",
        },
        style,
      ]}
    />
  );
}

export function Surface({ children, style, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: tokens.radius.lg,
          padding: tokens.space.lg,
          gap: tokens.space.sm,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export function ChoiceButton({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress?: () => void;
  selected?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: 1,
          borderRadius: tokens.radius.pill,
          paddingVertical: tokens.space.sm,
          paddingHorizontal: tokens.space.md,
          backgroundColor: selected ? colors.primary : "transparent",
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.primaryForeground : colors.foreground,
          fontSize: tokens.font.sm,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;
  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? "#B00020"
        : "transparent";
  const contentColor =
    variant === "primary"
      ? colors.primaryForeground
      : variant === "danger"
        ? "#FFFFFF"
        : colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: colors.border,
        },
        isDisabled && { opacity: 0.5 },
        pressed && !isDisabled && { opacity: 0.85 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={17} color={contentColor} /> : null}
          <Text style={[styles.buttonText, { color: contentColor }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenInner: { flex: 1, padding: tokens.space.lg, gap: tokens.space.md },
  button: {
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonInner: { flexDirection: "row", alignItems: "center", gap: tokens.space.sm },
  buttonText: { fontSize: tokens.font.md, fontWeight: "800" },
});

// Exposed for screens that build their own themed StyleSheet via makeStyles.
export type { Palette };
