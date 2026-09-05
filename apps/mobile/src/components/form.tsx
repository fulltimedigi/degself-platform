import React, { useMemo, useState } from "react";
import {
  FlatList, Modal, Pressable, StyleSheet, TextInput, View, type KeyboardTypeOptions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";
import type { Palette } from "@/theme/palettes";
import { useTheme } from "@/theme/theme-context";

function Label({ text, required }: { text: string; required?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.labelRow}>
      <ThemedText size="sm" bold>{text}</ThemedText>
      {required ? <ThemedText size="sm" style={{ color: colors.primary }}> *</ThemedText> : null}
    </View>
  );
}

export function Field({
  label, value, onChangeText, placeholder, required, error, multiline, keyboardType, maxLength,
}: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string;
  required?: boolean; error?: boolean; multiline?: boolean; keyboardType?: KeyboardTypeOptions; maxLength?: number;
}) {
  const { dir } = useI18n();
  const { colors } = useTheme();
  const ts = useMemo(() => themed(colors), [colors]);
  return (
    <View style={styles.group}>
      <Label text={label} required={required} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={[
          ts.input,
          styles.inputBase,
          multiline && styles.inputMultiline,
          error && { borderColor: colors.danger },
          { textAlign: dir === "rtl" ? "right" : "left", writingDirection: dir },
        ]}
      />
    </View>
  );
}

export function SelectField({
  label, value, placeholder, options, onSelect, required, error, renderLabel,
}: {
  label: string; value: string | null; placeholder: string; options: readonly string[];
  onSelect: (v: string) => void; required?: boolean; error?: boolean; renderLabel?: (v: string) => string;
}) {
  const { dir } = useI18n();
  const { colors } = useTheme();
  const ts = useMemo(() => themed(colors), [colors]);
  const [open, setOpen] = useState(false);
  const show = (v: string) => (renderLabel ? renderLabel(v) : v);
  return (
    <View style={styles.group}>
      <Label text={label} required={required} />
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [ts.input, styles.inputBase, styles.select, error && { borderColor: colors.danger }, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
        <ThemedText style={{ flex: 1, color: value ? colors.foreground : colors.muted, textAlign: dir === "rtl" ? "right" : "left" }}>
          {value ? show(value) : placeholder}
        </ThemedText>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <ThemedText size="lg" bold style={styles.sheetTitle}>{label}</ThemedText>
            <FlatList
              data={options as string[]}
              keyExtractor={(it) => it}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { onSelect(item); setOpen(false); }}
                  style={({ pressed }) => [styles.option, { borderBottomColor: colors.border }, pressed && { backgroundColor: colors.border }]}
                >
                  <ThemedText style={{ color: item === value ? colors.primary : colors.foreground }}>
                    {show(item)}
                  </ThemedText>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function ChipGroup({
  label, options, value, onSelect, required, error, renderLabel,
}: {
  label: string; options: readonly string[]; value: string | null; onSelect: (v: string) => void;
  required?: boolean; error?: boolean; renderLabel?: (v: string) => string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.group}>
      <Label text={label} required={required} />
      <View style={[styles.chips, error && { borderColor: colors.danger, borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space.sm }]}>
        {options.map((opt) => {
          const sel = opt === value;
          return (
            <Pressable
              key={opt}
              accessibilityRole="button"
              accessibilityState={{ selected: sel }}
              onPress={() => onSelect(opt)}
              style={({ pressed }) => [
                styles.chip,
                { borderColor: sel ? colors.primary : colors.border, backgroundColor: sel ? colors.primary : colors.surface },
                pressed && { opacity: 0.85 },
              ]}
            >
              <ThemedText size="sm" bold style={{ color: sel ? colors.primaryForeground : colors.foreground }}>
                {renderLabel ? renderLabel(opt) : opt}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Themed (color-bearing) styles, recomputed when the palette changes.
function themed(c: Palette) {
  return StyleSheet.create({
    input: {
      backgroundColor: c.surface,
      borderColor: c.border,
      color: c.foreground,
    },
  });
}

const styles = StyleSheet.create({
  group: { gap: tokens.space.sm },
  labelRow: { flexDirection: "row", alignItems: "center" },
  inputBase: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.md,
    fontSize: tokens.font.md,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: "top" },
  select: { flexDirection: "row", alignItems: "center", gap: tokens.space.sm },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: tokens.radius.lg, borderTopRightRadius: tokens.radius.lg,
    paddingTop: tokens.space.lg, paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.xl, maxHeight: "70%",
  },
  sheetTitle: { marginBottom: tokens.space.md },
  option: { paddingVertical: tokens.space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: tokens.space.sm },
  chip: {
    borderWidth: 1, borderRadius: tokens.radius.pill,
    paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md,
  },
});
