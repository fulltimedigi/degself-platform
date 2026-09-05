import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";

// DEGSELF is a WebView shell around the full web platform (degself.com). The
// heavy product UI lives on the web; this native app adds the shell + native
// affordances (external-link handling, offline, splash, and — phase 2 — push).
// Keep the splash up until the WebView paints its first frame (see app/index).
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0A0A0A" } }}>
        <Stack.Screen name="index" />
      </Stack>
    </SafeAreaProvider>
  );
}
