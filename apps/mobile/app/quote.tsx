import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Screen, Surface, ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme/theme-context";
import { tokens } from "@/theme/tokens";
import {
  QUOTE_AREAS,
  QUOTE_SERVICES,
  QUOTE_SERVICE_SHORT,
  QUOTE_URGENCIES,
} from "@/features/quote/data";
import { submitQuote, uploadQuotePhoto, QuoteError } from "@/features/quote/api";

const MAX_PHOTOS = 3;

// Small, self-contained ar/en copy (other locales fall back to en), matching the
// emergency-copy pattern so this screen owns its strings.
const COPY = {
  ar: {
    title: "اطلب عرض سعر",
    subtitle: "صوّر المشكلة واكتب تفاصيلها — نوصلها لأنسب الكراجات وترجعلك العروض.",
    photos: "صور المشكلة (اختياري لكن ينصح بها)",
    takePhoto: "التقط صورة",
    fromGallery: "من المعرض",
    service: "نوع الخدمة",
    area: "المنطقة",
    urgency: "الأولوية",
    name: "الاسم",
    phone: "رقم الهاتف (٨ أرقام)",
    car: "السيارة (نوع / موديل / سنة)",
    make: "النوع (مثال: تويوتا)",
    model: "الموديل (مثال: كامري)",
    year: "السنة",
    problem: "وصف المشكلة",
    problemPh: "اشرح العطل بكلامك: مش بيشتغل، صوت غريب، تكييف ضعيف…",
    submit: "إرسال الطلب",
    submitting: "جارٍ الإرسال…",
    uploading: "جارٍ رفع الصور…",
    successTitle: "تم إرسال طلبك ✅",
    successBody: "هنوصل طلبك للكراجات المناسبة، وهتوصلك العروض قريبًا.",
    done: "تمام",
    errRequired: "من فضلك املأ: الاسم، الهاتف، الخدمة، ووصف المشكلة.",
    errPhone: "أدخل رقم هاتف كويتي صحيح (٨ أرقام).",
    errRate: "طلبات كثيرة في وقت قصير. حاول بعد شوية.",
    errGeneric: "تعذّر إرسال الطلب. حاول مرة أخرى.",
    errPhoto: "تعذّر رفع الصورة. حاول مرة أخرى.",
    close: "إغلاق",
  },
  en: {
    title: "Request a quote",
    subtitle: "Photograph the problem and describe it — we route it to the best garages and bring you offers.",
    photos: "Photos of the problem (optional, recommended)",
    takePhoto: "Take photo",
    fromGallery: "From gallery",
    service: "Service",
    area: "Area",
    urgency: "Priority",
    name: "Name",
    phone: "Phone (8 digits)",
    car: "Car (make / model / year)",
    make: "Make (e.g. Toyota)",
    model: "Model (e.g. Camry)",
    year: "Year",
    problem: "Problem description",
    problemPh: "Describe the fault: won't start, strange noise, weak A/C…",
    submit: "Send request",
    submitting: "Sending…",
    uploading: "Uploading photos…",
    successTitle: "Request sent ✅",
    successBody: "We'll route your request to the right garages and bring you offers soon.",
    done: "Done",
    errRequired: "Please fill: name, phone, service, and problem description.",
    errPhone: "Enter a valid Kuwait phone number (8 digits).",
    errRate: "Too many requests. Please try again shortly.",
    errGeneric: "Couldn't send the request. Please try again.",
    errPhoto: "Couldn't upload the photo. Please try again.",
    close: "Close",
  },
} as const;

export default function QuoteScreen() {
  const { locale } = useI18n();
  const { colors } = useTheme();
  const c = COPY[locale === "ar" ? "ar" : "en"];
  const params = useLocalSearchParams<{ service?: string }>();

  const [photos, setPhotos] = useState<string[]>([]);
  const [service, setService] = useState<string>(
    typeof params.service === "string" ? params.service : ""
  );
  const [area, setArea] = useState<string>("");
  const [urgency, setUrgency] = useState<string>("عادي");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState<null | "uploading" | "submitting">(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const inputStyle = useMemo(
    () => ({
      color: colors.foreground,
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: tokens.radius.md,
      paddingHorizontal: tokens.space.md,
      paddingVertical: tokens.space.md,
      fontSize: tokens.font.md,
    }),
    [colors]
  );

  const addPhoto = useCallback(
    async (from: "camera" | "library") => {
      if (photos.length >= MAX_PHOTOS) return;
      try {
        const perm =
          from === "camera"
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        const res =
          from === "camera"
            ? await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: false })
            : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ["images"] });
        if (res.canceled || !res.assets?.[0]?.uri) return;
        void Haptics.selectionAsync().catch(() => {});
        setPhotos((p) => [...p, res.assets[0].uri].slice(0, MAX_PHOTOS));
      } catch {
        /* picker unavailable — ignore */
      }
    },
    [photos.length]
  );

  const removePhoto = useCallback((uri: string) => {
    setPhotos((p) => p.filter((u) => u !== uri));
  }, []);

  const onSubmit = useCallback(async () => {
    setErr(null);
    const phoneDigits = phone.replace(/\D/g, "");
    if (!name.trim() || !phoneDigits || !service || !problem.trim()) {
      setErr(c.errRequired);
      return;
    }
    if (phoneDigits.length !== 8) {
      setErr(c.errPhone);
      return;
    }
    try {
      let urls: string[] = [];
      if (photos.length > 0) {
        setBusy("uploading");
        urls = [];
        for (const uri of photos) urls.push(await uploadQuotePhoto(uri));
      }
      setBusy("submitting");
      await submitQuote({
        customer_name: name.trim(),
        customer_phone: phoneDigits,
        service,
        car_make: make.trim(),
        car_model: model.trim(),
        car_year: year.trim(),
        area,
        urgency,
        problem_description: problem.trim(),
        photos: urls,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setDone(true);
    } catch (e) {
      if (e instanceof QuoteError && e.code === "rate") setErr(c.errRate);
      else setErr(c.errGeneric);
    } finally {
      setBusy(null);
    }
  }, [name, phone, service, problem, photos, make, model, year, area, urgency, c]);

  if (done) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: tokens.space.md }}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <ThemedText size="xl" bold>{c.successTitle}</ThemedText>
          <ThemedText muted style={{ textAlign: "center" }}>{c.successBody}</ThemedText>
          <View style={{ alignSelf: "stretch", marginTop: tokens.space.md }}>
            <Button label={c.done} onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <ThemedText size="xl" bold style={{ flex: 1 }}>{c.title}</ThemedText>
        <Pressable accessibilityLabel={c.close} hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={colors.muted} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ gap: tokens.space.md, paddingBottom: tokens.space.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText muted size="sm">{c.subtitle}</ThemedText>

        {/* Photos — native camera / library */}
        <Surface>
          <ThemedText bold>{c.photos}</ThemedText>
          <View style={styles.photoRow}>
            {photos.map((uri) => (
              <View key={uri} style={styles.thumbWrap}>
                <Image source={{ uri }} style={styles.thumb} />
                <Pressable style={styles.thumbX} hitSlop={6} onPress={() => removePhoto(uri)}>
                  <Ionicons name="close-circle" size={22} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <>
                <Pressable
                  onPress={() => void addPhoto("camera")}
                  style={[styles.addPhoto, { borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}
                >
                  <Ionicons name="camera" size={22} color={colors.primary} />
                  <ThemedText size="sm">{c.takePhoto}</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => void addPhoto("library")}
                  style={[styles.addPhoto, { borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}
                >
                  <Ionicons name="images" size={22} color={colors.primary} />
                  <ThemedText size="sm">{c.fromGallery}</ThemedText>
                </Pressable>
              </>
            ) : null}
          </View>
        </Surface>

        {/* Service chips */}
        <ThemedText bold>{c.service}</ThemedText>
        <View style={styles.chips}>
          {QUOTE_SERVICES.map((s) => {
            const on = s === service;
            return (
              <Pressable
                key={s}
                onPress={() => setService(s)}
                style={[styles.chip, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary : "transparent" }]}
              >
                <ThemedText size="sm" bold style={{ color: on ? colors.primaryForeground : colors.foreground }}>
                  {QUOTE_SERVICE_SHORT[s] ?? s}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Area + urgency */}
        <ThemedText bold>{c.area}</ThemedText>
        <View style={styles.chips}>
          {QUOTE_AREAS.map((a) => {
            const on = a === area;
            return (
              <Pressable key={a} onPress={() => setArea(a)} style={[styles.chip, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary : "transparent" }]}>
                <ThemedText size="sm" bold style={{ color: on ? colors.primaryForeground : colors.foreground }}>{a}</ThemedText>
              </Pressable>
            );
          })}
        </View>
        <ThemedText bold>{c.urgency}</ThemedText>
        <View style={styles.chips}>
          {QUOTE_URGENCIES.map((u) => {
            const on = u === urgency;
            return (
              <Pressable key={u} onPress={() => setUrgency(u)} style={[styles.chip, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary : "transparent" }]}>
                <ThemedText size="sm" bold style={{ color: on ? colors.primaryForeground : colors.foreground }}>{u}</ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Car */}
        <ThemedText bold>{c.car}</ThemedText>
        <View style={{ flexDirection: "row", gap: tokens.space.sm }}>
          <TextInput style={[inputStyle, { flex: 1 }]} placeholder={c.make} placeholderTextColor={colors.muted} value={make} onChangeText={setMake} />
          <TextInput style={[inputStyle, { flex: 1 }]} placeholder={c.model} placeholderTextColor={colors.muted} value={model} onChangeText={setModel} />
          <TextInput style={[inputStyle, { width: 76 }]} placeholder={c.year} placeholderTextColor={colors.muted} value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />
        </View>

        {/* Contact */}
        <TextInput style={inputStyle} placeholder={c.name} placeholderTextColor={colors.muted} value={name} onChangeText={setName} />
        <TextInput style={inputStyle} placeholder={c.phone} placeholderTextColor={colors.muted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={12} />

        {/* Problem */}
        <ThemedText bold>{c.problem}</ThemedText>
        <TextInput
          style={[inputStyle, { minHeight: 96, textAlignVertical: "top" }]}
          placeholder={c.problemPh}
          placeholderTextColor={colors.muted}
          value={problem}
          onChangeText={setProblem}
          multiline
        />

        {err ? (
          <ThemedText style={{ color: colors.danger }}>{err}</ThemedText>
        ) : null}

        <Button
          label={busy === "uploading" ? c.uploading : busy === "submitting" ? c.submitting : c.submit}
          icon="send"
          loading={busy !== null}
          onPress={() => void onSubmit()}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: tokens.space.sm, marginBottom: tokens.space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: tokens.space.sm },
  chip: { borderWidth: 1, borderRadius: tokens.radius.pill, paddingVertical: tokens.space.sm, paddingHorizontal: tokens.space.md },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: tokens.space.sm, marginTop: tokens.space.sm },
  addPhoto: {
    width: 84, height: 84, borderRadius: tokens.radius.md, borderWidth: 1,
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  thumbWrap: { width: 84, height: 84 },
  thumb: { width: 84, height: 84, borderRadius: tokens.radius.md },
  thumbX: { position: "absolute", top: -6, insetInlineEnd: -6 },
});
