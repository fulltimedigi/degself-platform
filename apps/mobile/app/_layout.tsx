import "react-native-url-polyfill/auto";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack, router, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider } from "@/i18n";
import { ThemeProvider } from "@/theme/theme-context";
import { tokens } from "@/theme/tokens";
import { AuthProvider } from "@/lib/auth/auth-context";
import { FavoritesProvider } from "@/lib/favorites/favorites-context";
import { registerForPush, resolveNotificationUrl } from "@/shell/push";

// Root layout: providers + a headerless stack around the native (tabs) group,
// the native workshop detail, the OAuth callback, and the WebView surface used
// for the rich web-only flows (Ask degself, price calculator). The heavy
// product still lives on the web; the native tabs add the device-level
// experiences (maps + Core Location, emergency, camera, saved/offline) that
// make this a real app, not a web wrapper.
void SplashScreen.preventAutoHideAsync();

// A tapped push carrying a same-origin { url | path } opens the WebView surface
// at that address (both while running and on a cold start from a tapped push).
function openPushUrl(data: unknown) {
  const url = resolveNotificationUrl(data);
  if (url) router.push({ pathname: "/web", params: { url } });
}

// Surface any startup/render error on-screen instead of a bare native crash.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "800", marginBottom: 12 }}>خطأ في التشغيل</Text>
      <Text selectable style={{ color: "#E4795C", fontSize: 13, textAlign: "center" }}>
        {String((error as Error)?.message ?? error)}
      </Text>
      <Pressable onPress={retry} style={{ marginTop: 20, backgroundColor: "#FFD60A", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
        <Text style={{ color: "#0A0A0A", fontWeight: "800" }}>إعادة المحاولة</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  // Native shell is ready immediately; hide the splash once mounted.
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
    void registerForPush();
  }, []);

  // A tapped notification deep-links into the WebView surface, both while
  // running and on a cold start.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openPushUrl(response.notification.request.content.data);
    });
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) openPushUrl(response.notification.request.content.data);
      })
      .catch(() => {});
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <ThemeProvider>
          <AuthProvider>
            <FavoritesProvider>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: tokens.color.background },
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="workshop/[placeId]" />
                <Stack.Screen name="auth/callback" />
                <Stack.Screen name="quote" options={{ presentation: "modal" }} />
                <Stack.Screen name="web" options={{ presentation: "modal" }} />
              </Stack>
            </FavoritesProvider>
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
