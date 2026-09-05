import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  ChoiceButton,
  Screen,
  Surface,
  ThemedText,
} from "@/components/primitives";
import { Field } from "@/components/form";
import { LOCALE_LABEL, LOCALES, useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";
import type { Palette, ThemeMode } from "@/theme/palettes";
import { useTheme } from "@/theme/theme-context";
import { useAuth } from "@/lib/auth/auth-context";
import { useFavorites } from "@/lib/favorites/favorites-context";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { DangerZone } from "@/components/account/DangerZone";
import { settingsCopy } from "@/features/settings/copy";
import { getProfile, setProfile, type Profile } from "@/lib/prefs/profile";

// Settings hub. Two grouped sections following the platform settings
// convention: identity at the top, then "Account" (contact details used to
// pre-fill requests, saved garages, my requests, sign-out, and the destructive
// delete at the bottom), then "App" (language, appearance, privacy, version).
export default function AccountScreen() {
  const { t, locale, dir, setLocale } = useI18n();
  const { colors, mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { status, user, signOut } = useAuth();
  const { favorites } = useFavorites();
  const router = useRouter();
  const c = useMemo(() => settingsCopy(locale), [locale]);

  const [profile, setProfileState] = useState<Profile>({ name: "", whatsapp: "" });
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    void getProfile().then((p) => mounted && setProfileState(p));
    return () => {
      mounted = false;
    };
  }, []);

  async function saveProfile() {
    await setProfile(profile);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 1500);
  }

  const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];
  const themeLabel = (m: ThemeMode) =>
    m === "system" ? t.theme.system : m === "light" ? t.theme.light : t.theme.dark;
  const rowDir = dir === "rtl" ? "row-reverse" : ("row" as const);
  const chevron = dir === "rtl" ? "chevron-back" : "chevron-forward";
  const version = Constants.expoConfig?.version ?? "1.0.0";

  function NavRow({
    icon,
    label,
    value,
    onPress,
    last,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string;
    onPress: () => void;
    last?: boolean;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          { flexDirection: rowDir },
          !last && styles.rowBorderBottom,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Ionicons name={icon} size={20} color={colors.primary} />
        <ThemedText style={styles.flex}>{label}</ThemedText>
        {value ? <ThemedText muted size="sm">{value}</ThemedText> : null}
        <Ionicons name={chevron} size={18} color={colors.muted} />
      </Pressable>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: tokens.space.md, paddingBottom: tokens.space.xl }}>
        <ThemedText size="xl" bold>{c.title}</ThemedText>

        {/* Identity / sign-in */}
        {status === "loading" ? (
          <Surface><ThemedText muted>…</ThemedText></Surface>
        ) : status === "signedIn" ? (
          <Surface>
            <ThemedText muted size="sm">{c.emailLabel}</ThemedText>
            <ThemedText bold>{user?.email ?? user?.id ?? "—"}</ThemedText>
            <ThemedText muted size="sm">{c.emailManagedNote}</ThemedText>
            <Button label={t.auth.signOut} variant="secondary" icon="log-out-outline" onPress={() => void signOut()} />
          </Surface>
        ) : (
          <AuthPanel />
        )}

        {/* ===== Account settings ===== */}
        <ThemedText size="sm" bold style={styles.sectionLabel}>{c.accountSection}</ThemedText>

        {/* Contact details used to pre-fill requests (device-local) */}
        <Surface>
          <ThemedText bold>{c.profileTitle}</ThemedText>
          <ThemedText muted size="sm">{c.profileHint}</ThemedText>
          <Field
            label={c.nameLabel}
            value={profile.name}
            onChangeText={(v) => setProfileState((p) => ({ ...p, name: v }))}
            placeholder={c.namePh}
            maxLength={60}
          />
          <Field
            label={c.whatsappLabel}
            value={profile.whatsapp}
            onChangeText={(v) => setProfileState((p) => ({ ...p, whatsapp: v }))}
            placeholder={c.whatsappPh}
            keyboardType="phone-pad"
            maxLength={15}
          />
          <Button label={profileSaved ? c.saved : c.save} icon={profileSaved ? "checkmark" : "save-outline"} variant="secondary" onPress={() => void saveProfile()} />
        </Surface>

        <Surface style={styles.rowsCard}>
          <NavRow
            icon="heart-outline"
            label={c.savedGarages}
            value={favorites.length > 0 ? String(favorites.length) : undefined}
            onPress={() => router.push("/saved")}
          />
          <NavRow icon="receipt-outline" label={c.myQuotes} onPress={() => router.push("/my-quotes")} last />
        </Surface>

        {status === "signedIn" ? <DangerZone /> : null}

        {/* ===== App settings ===== */}
        <ThemedText size="sm" bold style={styles.sectionLabel}>{c.appSection}</ThemedText>

        <Surface>
          <ThemedText bold>{c.language}</ThemedText>
          <View style={[styles.chips, { flexDirection: rowDir }]}>
            {LOCALES.map((l) => (
              <ChoiceButton key={l} label={LOCALE_LABEL[l]} selected={l === locale} onPress={() => setLocale(l)} />
            ))}
          </View>
          <ThemedText muted size="sm">{t.rtlReloadNote}</ThemedText>
        </Surface>

        <Surface>
          <ThemedText bold>{c.appearance}</ThemedText>
          <View style={[styles.chips, { flexDirection: rowDir }]}>
            {THEME_MODES.map((m) => (
              <ChoiceButton key={m} label={themeLabel(m)} selected={m === mode} onPress={() => setMode(m)} />
            ))}
          </View>
        </Surface>

        <Surface style={styles.rowsCard}>
          <NavRow
            icon="shield-checkmark-outline"
            label={c.privacy}
            onPress={() => void Linking.openURL("https://degself.com/privacy#data-deletion")}
          />
          <View style={[styles.row, { flexDirection: rowDir }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <ThemedText style={styles.flex}>{c.about}</ThemedText>
            <ThemedText muted size="sm">{c.version} {version}</ThemedText>
          </View>
        </Surface>
      </ScrollView>
    </Screen>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    sectionLabel: { color: c.muted, marginTop: tokens.space.sm, marginHorizontal: tokens.space.xs },
    rowsCard: { paddingVertical: tokens.space.xs, gap: 0 },
    row: {
      alignItems: "center",
      gap: tokens.space.md,
      paddingVertical: tokens.space.md,
      paddingHorizontal: tokens.space.xs,
    },
    rowBorderBottom: { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth },
    flex: { flex: 1 },
    chips: { flexWrap: "wrap", gap: tokens.space.sm },
  });
}
