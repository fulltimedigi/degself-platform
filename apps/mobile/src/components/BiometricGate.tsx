import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { Ionicons } from "@expo/vector-icons";
import { Button, ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme/theme-context";
import { tokens } from "@/theme/tokens";

const COPY = {
  ar: { title: "محمي", body: "افتح بـ Face ID أو رمز الجهاز لعرض كراجاتك المحفوظة.", unlock: "فتح", again: "حاول مرة أخرى" },
  en: { title: "Protected", body: "Unlock with Face ID or your device passcode to view your saved garages.", unlock: "Unlock", again: "Try again" },
} as const;

/**
 * Gates its children behind device biometrics (Face ID / Touch ID) when the
 * device has enrolled biometrics AND `enabled` is true. Without enrolled
 * biometrics it renders children immediately (never locks the user out). This is
 * a genuine native, hardware-backed capability — not something a web page can do.
 */
export function BiometricGate({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const { locale } = useI18n();
  const { colors } = useTheme();
  const c = COPY[locale === "ar" ? "ar" : "en"];
  const [available, setAvailable] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const prompted = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [hasHw, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]).catch(() => [false, false]);
      if (mounted) setAvailable(Boolean(hasHw && enrolled));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const authenticate = useCallback(async () => {
    setBusy(true);
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: c.body,
        cancelLabel: c.again,
      });
      if (res.success) setUnlocked(true);
    } catch {
      /* keep locked; user can retry */
    } finally {
      setBusy(false);
    }
  }, [c]);

  // Auto-prompt once when the gate becomes active.
  useEffect(() => {
    if (enabled && available && !unlocked && !prompted.current) {
      prompted.current = true;
      void authenticate();
    }
  }, [enabled, available, unlocked, authenticate]);

  // No gate needed: disabled, still probing, unavailable, or already unlocked.
  if (!enabled || available === null || available === false || unlocked) {
    return <>{children}</>;
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: tokens.space.xl, gap: tokens.space.md }}>
      <Ionicons name="lock-closed" size={56} color={colors.primary} />
      <ThemedText size="xl" bold>{c.title}</ThemedText>
      <ThemedText muted style={{ textAlign: "center" }}>{c.body}</ThemedText>
      <View style={{ alignSelf: "stretch", marginTop: tokens.space.sm }}>
        <Button label={c.unlock} icon="finger-print" loading={busy} onPress={() => void authenticate()} />
      </View>
    </View>
  );
}
