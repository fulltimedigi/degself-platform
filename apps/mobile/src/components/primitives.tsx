import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextProps,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tokens } from "../theme/tokens";
import { useI18n } from "../i18n";

// Minimal OWNED primitives for M0 placeholders (no third-party UI kit, no shared
// UI package). Direction-aware text via the current locale's `dir` so RTL (ar/ur)
// and LTR (en/hi) alignment is visible immediately without a native reload.

export function Screen({ children, style, ...rest }: ViewProps) {
  return (
    <SafeAreaView style={[styles.screen, style]} {...rest}>
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
  return (
    <Text
      {...rest}
      style={[
        {
          color: muted ? tokens.color.muted : tokens.color.foreground,
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
  return (
    <View style={[styles.surface, style]} {...rest}>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.choiceSelected,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        isDisabled && { opacity: 0.5 },
        pressed && !isDisabled && { opacity: 0.85 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "primary" && { color: tokens.color.primaryForeground },
          variant === "secondary" && { color: tokens.color.foreground },
          variant === "danger" && { color: "#FFFFFF" },
        ]}
      >
        {loading ? "…" : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.background },
  screenInner: { flex: 1, padding: tokens.space.lg, gap: tokens.space.md },
  surface: {
    backgroundColor: tokens.color.surface,
    borderColor: tokens.color.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    gap: tokens.space.sm,
  },
  choice: {
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
  },
  choiceSelected: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
  choiceText: { color: tokens.color.foreground, fontSize: tokens.font.sm, fontWeight: "700" },
  choiceTextSelected: { color: tokens.color.primaryForeground },
  button: {
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.md,
    paddingHorizontal: tokens.space.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: { backgroundColor: tokens.color.primary },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderColor: tokens.color.border,
    borderWidth: 1,
  },
  buttonDanger: { backgroundColor: "#B00020" },
  buttonText: { fontSize: tokens.font.md, fontWeight: "800" },
});
