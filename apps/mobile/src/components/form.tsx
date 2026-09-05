import React, { useState } from "react";
import {
  FlatList, Modal, Pressable, StyleSheet, TextInput, View, type KeyboardTypeOptions,
} from "react-native";
import { ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <View style={styles.labelRow}>
      <ThemedText size="sm" bold style={styles.label}>{text}</ThemedText>
      {required ? <ThemedText size="sm" style={styles.req}> *</ThemedText> : null}
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
  return (
    <View style={styles.group}>
      <Label text={label} required={required} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.color.muted}
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          error && styles.inputError,
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
  const [open, setOpen] = useState(false);
  const show = (v: string) => (renderLabel ? renderLabel(v) : v);
  return (
    <View style={styles.group}>
      <Label text={label} required={required} />
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.input, styles.select, error && styles.inputError, pressed && { opacity: 0.85 }]}
      >
        <ThemedText style={{ color: tokens.color.muted }}>▾</ThemedText>
        <ThemedText style={{ flex: 1, color: value ? tokens.color.foreground : tokens.color.muted, textAlign: dir === "rtl" ? "right" : "left" }}>
          {value ? show(value) : placeholder}
        </ThemedText>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <ThemedText size="lg" bold style={styles.sheetTitle}>{label}</ThemedText>
            <FlatList
              data={options as string[]}
              keyExtractor={(it) => it}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { onSelect(item); setOpen(false); }}
                  style={({ pressed }) => [styles.option, pressed && { backgroundColor: tokens.color.border }]}
                >
                  <ThemedText style={{ color: item === value ? tokens.color.primary : tokens.color.foreground }}>
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
  return (
    <View style={styles.group}>
      <Label text={label} required={required} />
      <View style={[styles.chips, error && styles.chipsError]}>
        {options.map((opt) => {
          const sel = opt === value;
          return (
            <Pressable
              key={opt}
              accessibilityRole="button"
              accessibilityState={{ selected: sel }}
              onPress={() => onSelect(opt)}
              style={({ pressed }) => [styles.chip, sel && styles.chipSel, pressed && { opacity: 0.85 }]}
            >
              <ThemedText size="sm" bold style={{ color: sel ? tokens.color.primaryForeground : tokens.color.foreground }}>
                {renderLabel ? renderLabel(opt) : opt}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: tokens.space.sm },
  labelRow: { flexDirection: "row", alignItems: "center" },
  label: {}, req: { color: tokens.color.primary },
  input: {
    backgroundColor: tokens.color.surface, borderColor: tokens.color.border, borderWidth: 1,
    borderRadius: tokens.radius.md, paddingHorizontal: tokens.space.md, paddingVertical: tokens.space.md,
    color: tokens.color.foreground, fontSize: tokens.font.md,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: "top" },
  inputError: { borderColor: "#E4795C" },
  select: { flexDirection: "row", alignItems: "center", gap: tokens.space.sm },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: tokens.color.surface, borderTopLeftRadius: tokens.radius.lg, borderTopRightRadius: tokens.radius.lg,
    paddingTop: tokens.space.lg, paddingHorizontal: tokens.space.lg, paddingBottom: tokens.space.xl, maxHeight: "70%",
  },
  sheetTitle: { marginBottom: tokens.space.md },
  option: { paddingVertical: tokens.space.md, borderBottomColor: tokens.color.border, borderBottomWidth: StyleSheet.hairlineWidth },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: tokens.space.sm },
  chipsError: { borderColor: "#E4795C", borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.space.sm },
  chip: {
    borderColor: tokens.color.border, borderWidth: 1, borderRadius: tokens.radius.pill,
    paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md, backgroundColor: tokens.color.surface,
  },
  chipSel: { backgroundColor: tokens.color.primary, borderColor: tokens.color.primary },
});
