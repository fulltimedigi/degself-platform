import { useEffect, useState } from "react";
import { View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { Button, Surface, ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";
import { useAuth } from "@/lib/auth/auth-context";
import { GoogleSignInCancelled } from "@/lib/auth/google";
import { AppleSignInCancelled, isAppleAuthAvailable } from "@/lib/auth/apple";

// Signed-out panel: native Google (all platforms) + Sign in with Apple (iOS
// only, and only where the OS supports it). Apple is REQUIRED on iOS because the
// app offers Google (Guideline 4.8) — but the button must not appear on Android,
// where it isn't available.

export function AuthPanel() {
  const { t } = useI18n();
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    isAppleAuthAvailable().then((ok) => mounted && setAppleAvailable(ok));
    return () => {
      mounted = false;
    };
  }, []);

  async function run(
    provider: "google" | "apple",
    fn: () => Promise<void>,
    Cancelled: new () => Error
  ) {
    setNotice(null);
    setBusy(provider);
    try {
      await fn();
      // Success flips app state via the auth listener; nothing else to do.
    } catch (e) {
      if (e instanceof Cancelled) setNotice(t.auth.cancelled);
      else setNotice(t.auth.genericError);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Surface>
      <ThemedText size="lg" bold>
        {t.auth.signedOutTitle}
      </ThemedText>
      <ThemedText muted size="sm">
        {t.auth.signedOutBody}
      </ThemedText>
      <View style={{ gap: tokens.space.sm, marginTop: tokens.space.sm }}>
        <Button
          label={t.auth.continueWithGoogle}
          onPress={() =>
            run("google", signInWithGoogle, GoogleSignInCancelled)
          }
          loading={busy === "google"}
          disabled={busy !== null}
        />
        {appleAvailable ? (
          // Apple REQUIRES the official Sign in with Apple button (App Review 4.8
          // / Human Interface Guidelines) — not a custom imitation. The system
          // component renders Apple's compliant appearance + localized label; we
          // only guard against concurrent taps via `busy`.
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            }
            cornerRadius={tokens.radius.md}
            style={{ height: 48, width: "100%" }}
            onPress={() => {
              if (busy !== null) return;
              void run("apple", signInWithApple, AppleSignInCancelled);
            }}
          />
        ) : null}
      </View>
      {notice ? (
        <ThemedText muted size="sm">
          {notice}
        </ThemedText>
      ) : null}
    </Surface>
  );
}
