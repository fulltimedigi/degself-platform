import { View } from "react-native";
import {
  Button,
  ChoiceButton,
  Screen,
  Surface,
  ThemedText,
} from "@/components/primitives";
import { LOCALE_LABEL, LOCALES, useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";
import { useAuth } from "@/lib/auth/auth-context";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { DangerZone } from "@/components/account/DangerZone";

// Account screen: locale switcher (M0) + M1 auth. Signed-out shows the sign-in
// panel; signed-in shows the profile summary, sign out, and the deletion Danger
// Zone. Profile uses the Supabase-verified identity (email) — no mobile-specific
// profile table.
export default function AccountScreen() {
  const { t, locale, dir, setLocale } = useI18n();
  const { status, user, signOut } = useAuth();

  return (
    <Screen>
      <ThemedText size="xl" bold>
        {t.tabs.account}
      </ThemedText>

      {status === "loading" ? (
        <Surface>
          <ThemedText muted>…</ThemedText>
        </Surface>
      ) : status === "signedIn" ? (
        <>
          <Surface>
            <ThemedText muted size="sm">
              {t.auth.signedInAs}
            </ThemedText>
            <ThemedText bold>{user?.email ?? user?.id ?? "—"}</ThemedText>
            <Button
              label={t.auth.signOut}
              variant="secondary"
              onPress={() => void signOut()}
            />
          </Surface>
          <DangerZone />
        </>
      ) : (
        <AuthPanel />
      )}

      <Surface>
        <ThemedText bold>{t.languageLabel}</ThemedText>
        <View
          style={{
            flexDirection: dir === "rtl" ? "row-reverse" : "row",
            flexWrap: "wrap",
            gap: tokens.space.sm,
          }}
        >
          {LOCALES.map((l) => (
            <ChoiceButton
              key={l}
              label={LOCALE_LABEL[l]}
              selected={l === locale}
              onPress={() => setLocale(l)}
            />
          ))}
        </View>
        <ThemedText muted size="sm">
          {t.directionLabel}: {dir.toUpperCase()}
        </ThemedText>
        <ThemedText muted size="sm">
          {t.rtlReloadNote}
        </ThemedText>
      </Surface>
    </Screen>
  );
}
