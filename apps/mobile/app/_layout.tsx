import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider } from "@/i18n";
import { tokens } from "@/theme/tokens";

// Root layout: providers + a headerless stack. The (tabs) group is the single
// route in M0. No auth, no data — foundation only.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: tokens.color.background },
          }}
        />
      </I18nProvider>
    </SafeAreaProvider>
  );
}
