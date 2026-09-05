import { useEffect, useRef } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Screen, ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth/auth-context";
import { tokens } from "@/theme/tokens";

// Waiting room for the Google OAuth deep link. The provider redirects the device
// to `degself://auth/callback`; Android hands that intent to the app and
// expo-router resolves it as this route. Without this screen the router rendered
// its "Unmatched Route" fallback on top of a sign-in that had already succeeded.
//
// This is NOT a second callback handler. It reads no route params, renders and
// logs no URL/query string/authorization code, and never calls
// exchangeCodeForSession. The single-use PKCE code is still spent exactly once,
// in google.ts, driven by the browser auth session that started the flow.
//
// The screen watches session state from auth-context alone and hands off with
// router.replace to the account screen. A fail-safe deadline leaves for the same
// destination if no session ever settles, so it can never strand the user. The
// hand-off is one-shot and its target is never this route, so no sequence of
// status changes or a late deadline can start a redirect loop.
const HANDOFF = "/(tabs)/account";
const DEADLINE_MS = 8000;

export default function AuthCallback() {
  const { t } = useI18n();
  const { status } = useAuth();
  const left = useRef(false);

  useEffect(() => {
    const leave = () => {
      if (left.current) return;
      left.current = true;
      router.replace(HANDOFF);
    };
    if (status !== "loading") leave();
    const timer = setTimeout(leave, DEADLINE_MS);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <Screen>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: tokens.space.md,
        }}
      >
        <ThemedText size="lg" bold>
          {t.auth.completingSignIn}
        </ThemedText>
      </View>
    </Screen>
  );
}
