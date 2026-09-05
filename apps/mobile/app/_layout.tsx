import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider } from "@/i18n";
import { tokens } from "@/theme/tokens";
import { AuthProvider } from "@/lib/auth/auth-context";
import { FavoritesProvider } from "@/lib/favorites/favorites-context";

// Root layout: providers + a headerless stack. M1 adds AuthProvider (Supabase
// session authority) and FavoritesProvider (auth-aware favorites + handoff)
// around the (tabs) group. FavoritesProvider is nested inside AuthProvider
// because it reacts to auth state.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
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
            </Stack>
          </FavoritesProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
