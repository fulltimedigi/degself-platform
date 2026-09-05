import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider } from "@/i18n";
import { ThemeProvider, useTheme } from "@/theme/theme-context";
import { AuthProvider } from "@/lib/auth/auth-context";
import { FavoritesProvider } from "@/lib/favorites/favorites-context";

// Root layout: providers + a headerless stack. ThemeProvider is outermost so
// every screen can read the live palette; StatusBar bar-style and the stack
// background follow the resolved scheme (light|dark).
function ThemedStack() {
  const { scheme, colors } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "light" ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workshop/[placeId]" />
        <Stack.Screen name="saved" />
        <Stack.Screen name="my-quotes" />
        <Stack.Screen name="auth/callback" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <FavoritesProvider>
              <ThemedStack />
            </FavoritesProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
