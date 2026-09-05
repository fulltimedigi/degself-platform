import "react-native-url-polyfill/auto";
import { Pressable, Text, View } from "react-native";
import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";

// DEGSELF is a WebView shell around the full web platform (degself.com). The
// heavy product UI lives on the web; this native app adds the shell + native
// affordances (external-link handling, offline, splash, and — phase 2 — push).
// Keep the splash up until the WebView paints its first frame (see app/index).
void SplashScreen.preventAutoHideAsync();

// Surface any startup/render error on-screen instead of a bare native crash, so
// issues are legible on a real device (and screenshot-able) rather than silent.
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
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0A0A0A" } }}>
        <Stack.Screen name="index" />
      </Stack>
    </SafeAreaProvider>
  );
}
