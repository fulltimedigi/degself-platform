import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Screen, Surface, ThemedText } from "@/components/primitives";
import { Field, SelectField } from "@/components/form";
import { useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";
import { asaaliCopy } from "@/features/asaali/copy";
import { whatsAppUrl } from "@/features/asaali/wa";
import { QUOTE_YEARS } from "@/features/quote/data";
import {
  askAsaali,
  AsaaliError,
  type AsaaliResponse,
  type AsaaliWorkshop,
} from "@/features/asaali/api";

type Turn = { role: "user" | "assistant"; content: string };
const MAX_HISTORY = 6;

export default function AsaaliScreen() {
  const { locale } = useI18n();
  const router = useRouter();
  const c = useMemo(() => asaaliCopy(locale), [locale]);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AsaaliResponse | null>(null);
  const [history, setHistory] = useState<Turn[]>([]);

  // Optional vehicle context.
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [vehiclePrompted, setVehiclePrompted] = useState(false);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<string | null>(null);

  const hasVehicle = make.trim().length > 0 || model.trim().length > 0 || !!year;

  async function ask(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const vehicle = hasVehicle
        ? {
            make: make.trim() || undefined,
            model: model.trim() || undefined,
            year: year ? Number(year) : undefined,
          }
        : undefined;
      const data = await askAsaali({
        text,
        vehicle,
        vehicle_skipped: !hasVehicle && vehiclePrompted,
        locale,
        conversation_history: history.slice(-MAX_HISTORY),
      });
      if (data.status === "needs_vehicle_info") {
        setVehicleOpen(true);
        setVehiclePrompted(true);
      }
      setResponse(data);
      setHistory((h) => [
        ...h,
        { role: "user", content: text },
        {
          role: "assistant",
          content:
            data.problem_summary ?? data.follow_up_question ?? data.fallback_message ?? "",
        },
      ]);
      setInput("");
    } catch (e) {
      setError(e instanceof AsaaliError ? c.errConn : c.errConn);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResponse(null);
    setHistory([]);
    setInput("");
    setError(null);
  }

  async function shareMessage(message: string) {
    try {
      await Share.share({ message });
    } catch {
      /* user dismissed the share sheet — ignore */
    }
  }

  const showWarning = response?.warning && response.warning.severity !== "safe";
  const urgent = response?.warning?.severity === "urgent";

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.badge}>
              <ThemedText size="sm" bold style={{ color: tokens.color.primaryForeground }}>
                {c.badge}
              </ThemedText>
            </View>
            <ThemedText size="xxl" bold>{c.title}</ThemedText>
            <ThemedText muted>{c.subtitle}</ThemedText>
          </View>

          {/* Optional vehicle */}
          <Pressable onPress={() => setVehicleOpen((v) => !v)} accessibilityRole="button">
            <ThemedText size="sm" bold style={{ color: tokens.color.primary }}>
              {vehicleOpen ? c.vehicleToggleHide : c.vehicleToggleShow}
            </ThemedText>
          </Pressable>
          {vehicleOpen ? (
            <Surface style={styles.section}>
              <ThemedText muted size="sm">{c.vehicleHint}</ThemedText>
              <Field label={c.makeLabel} value={make} onChangeText={setMake} placeholder={c.makePh} maxLength={40} />
              <Field label={c.modelLabel} value={model} onChangeText={setModel} placeholder={c.modelPh} maxLength={40} />
              <SelectField label={c.yearLabel} value={year} placeholder={c.pick} options={QUOTE_YEARS} onSelect={setYear} />
            </Surface>
          ) : null}

          {/* Input */}
          <Surface style={styles.section}>
            <Field
              label={c.title}
              value={input}
              onChangeText={setInput}
              placeholder={c.inputPlaceholder}
              multiline
              maxLength={800}
            />
            <View style={styles.actions}>
              {response ? (
                <View style={styles.flex}>
                  <Button label={c.newChat} variant="secondary" onPress={reset} />
                </View>
              ) : null}
              <View style={styles.flex}>
                <Button label={busy ? c.asking : c.ask} onPress={() => void ask()} loading={busy} disabled={!input.trim()} />
              </View>
            </View>
          </Surface>

          {error ? <ThemedText style={styles.err}>{error}</ThemedText> : null}

          {/* Empty-state examples */}
          {!response && !busy ? (
            <Surface style={styles.section}>
              <ThemedText size="sm" muted>{c.emptyTitle}</ThemedText>
              <View style={styles.examples}>
                {c.emptyExamples.map((ex) => (
                  <Pressable
                    key={ex}
                    accessibilityRole="button"
                    onPress={() => void ask(ex)}
                    style={({ pressed }) => [styles.example, pressed && { opacity: 0.85 }]}
                  >
                    <ThemedText size="sm">{ex}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </Surface>
          ) : null}

          {/* Response */}
          {response ? (
            <View style={styles.section}>
              {response.fallback_message ? (
                <Surface><ThemedText>{response.fallback_message}</ThemedText></Surface>
              ) : null}

              {response.follow_up_question ? (
                <Surface style={styles.accentCard}>
                  <ThemedText size="sm" style={{ color: tokens.color.primary }}>{c.followUpLabel}</ThemedText>
                  <ThemedText>{response.follow_up_question}</ThemedText>
                </Surface>
              ) : null}

              {response.problem_summary ? (
                <Surface>
                  <ThemedText size="sm" muted>{c.summaryLabel}</ThemedText>
                  <ThemedText>{response.problem_summary}</ThemedText>
                </Surface>
              ) : null}

              {showWarning && response.warning ? (
                <Surface style={[styles.warn, urgent ? styles.warnUrgent : styles.warnCaution]}>
                  <View style={styles.warnHead}>
                    <Ionicons
                      name={urgent ? "warning" : "alert-circle"}
                      size={16}
                      color={urgent ? tokens.color.danger : tokens.color.warning}
                    />
                    <ThemedText size="sm" bold style={{ color: urgent ? tokens.color.danger : tokens.color.warning }}>
                      {urgent ? c.warnUrgent : c.warnCaution}
                    </ThemedText>
                  </View>
                  <ThemedText>{response.warning.message}</ThemedText>
                  <ThemedText bold>→ {response.warning.action}</ThemedText>
                </Surface>
              ) : null}

              {response.explanation ? (
                <Surface>
                  <ThemedText size="sm" muted>{c.explanationLabel}</ThemedText>
                  <ThemedText muted>{response.explanation}</ThemedText>
                </Surface>
              ) : null}

              {response.recommended_workshops && response.recommended_workshops.length > 0 ? (
                <Surface>
                  <ThemedText size="sm" muted>{c.workshopsLabel}</ThemedText>
                  <View style={{ gap: tokens.space.sm }}>
                    {response.recommended_workshops.map((w) => (
                      <WorkshopRow
                        key={w.id}
                        workshop={w}
                        callLabel={c.callBtn}
                        waLabel={c.whatsappBtn}
                        onCall={(phone) => void Linking.openURL(`tel:${phone}`)}
                        onWhatsApp={(phone) =>
                          void Linking.openURL(whatsAppUrl(phone, response.whatsapp_message))
                        }
                      />
                    ))}
                  </View>
                  <Pressable onPress={() => router.push("/(tabs)/search")} accessibilityRole="button">
                    <ThemedText size="sm" style={{ color: tokens.color.primary, textAlign: "center", marginTop: tokens.space.sm }}>
                      {c.viewAllWorkshops}
                    </ThemedText>
                  </Pressable>
                </Surface>
              ) : null}

              {response.whatsapp_message ? (
                <Surface style={styles.accentCard}>
                  <View style={styles.waHeader}>
                    <ThemedText size="sm" style={{ color: tokens.color.primary }}>{c.whatsappLabel}</ThemedText>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void shareMessage(response.whatsapp_message ?? "")}
                      style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]}
                    >
                      <Ionicons name="paper-plane" size={14} color={tokens.color.primaryForeground} />
                      <ThemedText size="sm" bold style={{ color: tokens.color.primaryForeground }}>{c.shareBtn}</ThemedText>
                    </Pressable>
                  </View>
                  <ThemedText>{response.whatsapp_message}</ThemedText>
                </Surface>
              ) : null}

              {response.official_terms && response.official_terms.length > 0 ? (
                <Surface>
                  <ThemedText size="sm" muted>{c.officialTermLabel}</ThemedText>
                  {response.official_terms.map((term, i) => (
                    <View key={i} style={styles.termRow}>
                      <ThemedText bold>{term.arabic}</ThemedText>
                      <ThemedText muted size="sm">{term.english}</ThemedText>
                    </View>
                  ))}
                </Surface>
              ) : null}
            </View>
          ) : null}

          <ThemedText size="sm" muted style={styles.disclaimer}>{c.disclaimer}</ThemedText>
          <View style={{ height: tokens.space.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function WorkshopRow({
  workshop,
  callLabel,
  waLabel,
  onCall,
  onWhatsApp,
}: {
  workshop: AsaaliWorkshop;
  callLabel: string;
  waLabel: string;
  onCall: (phone: string) => void;
  onWhatsApp: (phone: string) => void;
}) {
  return (
    <View style={styles.wsRow}>
      <View style={styles.flex}>
        <ThemedText numberOfLines={1}>{workshop.name}</ThemedText>
        {workshop.area ? <ThemedText size="sm" muted>{workshop.area}</ThemedText> : null}
      </View>
      {workshop.phone ? (
        <View style={styles.wsActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={waLabel}
            onPress={() => onWhatsApp(workshop.phone!)}
            style={({ pressed }) => [styles.wsBtn, styles.wsWa, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" />
            <ThemedText size="sm" bold style={{ color: "#FFFFFF" }}>{waLabel}</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={callLabel}
            onPress={() => onCall(workshop.phone!)}
            style={({ pressed }) => [styles.wsBtn, styles.wsCall, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="call" size={14} color={tokens.color.primaryForeground} />
            <ThemedText size="sm" bold style={{ color: tokens.color.primaryForeground }}>{callLabel}</ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: tokens.space.md, paddingBottom: tokens.space.xl },
  hero: { gap: tokens.space.sm },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: tokens.color.primary,
    borderRadius: tokens.radius.pill,
    paddingVertical: 4,
    paddingHorizontal: tokens.space.md,
  },
  section: { gap: tokens.space.md },
  actions: { flexDirection: "row", gap: tokens.space.sm },
  flex: { flex: 1 },
  err: { color: tokens.color.danger },
  examples: { gap: tokens.space.sm },
  example: {
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    backgroundColor: tokens.color.surfaceRaised,
  },
  accentCard: { borderColor: tokens.color.primary, borderWidth: 1 },
  warn: { borderWidth: 1 },
  warnHead: { flexDirection: "row", alignItems: "center", gap: tokens.space.sm },
  warnUrgent: { borderColor: tokens.color.danger, backgroundColor: "rgba(228,121,92,0.10)" },
  warnCaution: { borderColor: tokens.color.warning, backgroundColor: "rgba(224,184,77,0.10)" },
  waHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: tokens.space.sm },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: tokens.color.primary,
    borderRadius: tokens.radius.sm,
    paddingVertical: 8,
    paddingHorizontal: tokens.space.md,
  },
  termRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: tokens.space.sm },
  wsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    backgroundColor: tokens.color.surfaceRaised,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
  },
  wsActions: { flexDirection: "row", gap: tokens.space.sm },
  wsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: tokens.radius.sm,
    paddingVertical: 8,
    paddingHorizontal: tokens.space.md,
  },
  wsWa: { backgroundColor: tokens.color.whatsapp },
  wsCall: { backgroundColor: tokens.color.primary },
  disclaimer: { textAlign: "center", marginTop: tokens.space.sm },
});
