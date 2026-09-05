import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Screen, Surface, ThemedText } from "@/components/primitives";
import { Field, SelectField, ChipGroup } from "@/components/form";
import { useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";
import type { Palette } from "@/theme/palettes";
import { useTheme } from "@/theme/theme-context";
import { quoteCopy } from "@/features/quote/copy";
import {
  QUOTE_SERVICES, QUOTE_SERVICE_SHORT, QUOTE_AREAS, QUOTE_URGENCIES, QUOTE_YEARS,
} from "@/features/quote/data";
import { submitQuote, QuoteError } from "@/features/quote/api";

const PHONE_RE = /^[0-9+\s-]{7,15}$/;

export default function QuoteScreen() {
  const { locale } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const c = useMemo(() => quoteCopy(locale), [locale]);

  const [service, setService] = useState<string | null>(null);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<string>("عادي");
  const [problem, setProblem] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [errs, setErrs] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function reset() {
    setService(null); setMake(""); setModel(""); setYear(null); setArea(null);
    setUrgency("عادي"); setProblem(""); setName(""); setPhone("");
    setErrs({}); setMsg(null); setDone(false);
  }

  async function onSubmit() {
    const e: Record<string, boolean> = {};
    if (name.trim().length < 2) e.name = true;
    if (!PHONE_RE.test(phone.trim())) e.phone = true;
    if (!service) e.service = true;
    if (!make.trim() || !model.trim() || !year) e.car = true;
    if (!area) e.area = true;
    if (problem.trim().length < 10) e.problem = true;
    setErrs(e);
    if (Object.keys(e).length > 0) {
      setMsg(e.name ? c.errName : e.phone ? c.errPhone : e.service ? c.errService
        : e.car ? c.errCar : e.area ? c.errArea : c.errProblem);
      return;
    }
    setMsg(null); setBusy(true);
    try {
      await submitQuote({
        customer_name: name.trim(), customer_phone: phone.trim(), service: service!,
        car_make: make.trim(), car_model: model.trim(), car_year: year!, area: area!,
        urgency, problem_description: problem.trim(),
      });
      setDone(true);
    } catch (err) {
      setMsg(err instanceof QuoteError && err.code === "rate" ? c.errRate : c.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Screen>
        <View style={styles.success}>
          <View style={styles.check}><Ionicons name="checkmark-sharp" size={52} color={colors.primaryForeground} /></View>
          <ThemedText size="xxl" bold style={styles.center}>{c.successTitle}</ThemedText>
          <ThemedText muted style={styles.center}>{c.successBody}</ThemedText>
          <View style={{ height: tokens.space.md }} />
          <Button label={c.again} variant="secondary" onPress={reset} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <ThemedText size="xxl" bold>{c.title}</ThemedText>
            <ThemedText muted>{c.subtitle}</ThemedText>
            <View style={styles.freeChip}><ThemedText size="sm" bold style={{ color: colors.primaryForeground }}>{c.free}</ThemedText></View>
          </View>

          <Surface style={styles.section}>
            <SelectField label={c.serviceLabel} value={service} placeholder={c.pick}
              options={QUOTE_SERVICES} onSelect={setService} required error={errs.service}
              renderLabel={(v) => QUOTE_SERVICE_SHORT[v] ?? v} />
          </Surface>

          <Surface style={styles.section}>
            <ThemedText size="lg" bold>{c.carLabel}</ThemedText>
            <Field label={c.makeLabel} value={make} onChangeText={setMake} placeholder={c.makePh} required error={errs.car} maxLength={60} />
            <Field label={c.modelLabel} value={model} onChangeText={setModel} placeholder={c.modelPh} required error={errs.car} maxLength={60} />
            <SelectField label={c.yearLabel} value={year} placeholder={c.pick} options={QUOTE_YEARS} onSelect={setYear} required error={errs.car} />
          </Surface>

          <Surface style={styles.section}>
            <SelectField label={c.areaLabel} value={area} placeholder={c.pick} options={QUOTE_AREAS} onSelect={setArea} required error={errs.area} />
            <ChipGroup label={c.urgencyLabel} options={QUOTE_URGENCIES} value={urgency} onSelect={setUrgency} />
          </Surface>

          <Surface style={styles.section}>
            <Field label={c.problemLabel} value={problem} onChangeText={setProblem} placeholder={c.problemPh} required error={errs.problem} multiline maxLength={1000} />
          </Surface>

          <Surface style={styles.section}>
            <Field label={c.nameLabel} value={name} onChangeText={setName} placeholder={c.namePh} required error={errs.name} maxLength={60} />
            <Field label={c.phoneLabel} value={phone} onChangeText={setPhone} placeholder={c.phonePh} required error={errs.phone} keyboardType="phone-pad" maxLength={15} />
          </Surface>

          {msg ? <ThemedText style={styles.err}>{msg}</ThemedText> : null}
          <Button label={busy ? c.submitting : c.submit} onPress={onSubmit} loading={busy} />
          <View style={{ height: tokens.space.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    content: { gap: tokens.space.md, paddingBottom: tokens.space.xl },
    hero: { gap: tokens.space.sm, marginBottom: tokens.space.xs },
    freeChip: { alignSelf: "flex-start", backgroundColor: c.primary, borderRadius: tokens.radius.pill, paddingVertical: 4, paddingHorizontal: tokens.space.md, marginTop: tokens.space.xs },
    section: { gap: tokens.space.md },
    err: { color: c.danger },
    success: { flex: 1, alignItems: "center", justifyContent: "center", gap: tokens.space.sm, paddingHorizontal: tokens.space.lg },
    center: { textAlign: "center" },
    check: { width: 96, height: 96, borderRadius: 48, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", marginBottom: tokens.space.md },
  });
}
