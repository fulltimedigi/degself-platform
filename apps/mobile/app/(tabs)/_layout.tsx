import { Tabs } from "expo-router";
import { useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";

// Four structural placeholder tabs. Labels are localized; no icons in M0 (avoids
// an extra dependency). Tab/reading order follows the platform + current locale.
export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.color.primary,
        tabBarInactiveTintColor: tokens.color.muted,
        tabBarStyle: {
          backgroundColor: tokens.color.surface,
          borderTopColor: tokens.color.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabs.home }} />
      <Tabs.Screen name="search" options={{ title: t.tabs.search }} />
      <Tabs.Screen name="quote" options={{ title: t.tabs.quote }} />
      <Tabs.Screen name="saved" options={{ title: t.tabs.saved }} />
      <Tabs.Screen name="account" options={{ title: t.tabs.account }} />
    </Tabs>
  );
}
