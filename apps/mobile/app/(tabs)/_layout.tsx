import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/i18n";
import { useTheme } from "@/theme/theme-context";

// Icon per tab: outline when inactive, solid when active — the standard
// iOS/Material selected-state cue. `home` is the flagship "اسأل" spark.
type IoniconName = keyof typeof Ionicons.glyphMap;
const ICONS: Record<string, { on: IoniconName; off: IoniconName }> = {
  index: { on: "home", off: "home-outline" },
  asaali: { on: "sparkles", off: "sparkles-outline" },
  search: { on: "search", off: "search-outline" },
  quote: { on: "pricetags", off: "pricetags-outline" },
  account: { on: "settings", off: "settings-outline" },
};

export default function TabsLayout() {
  const { t } = useI18n();
  const { colors } = useTheme();
  // Add the device's bottom inset (Android gesture/3-button bar, iOS home
  // indicator) so the bar never sits under the system navigation.
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 58 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
        tabBarIcon: ({ color, focused, size }) => {
          const icon = ICONS[route.name];
          if (!icon) return null;
          return (
            <Ionicons name={focused ? icon.on : icon.off} size={size ?? 22} color={color} />
          );
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: t.tabs.home }} />
      <Tabs.Screen name="asaali" options={{ title: t.tabs.asaali }} />
      <Tabs.Screen name="search" options={{ title: t.tabs.search }} />
      <Tabs.Screen name="quote" options={{ title: t.tabs.quote }} />
      <Tabs.Screen name="account" options={{ title: t.tabs.settings }} />
    </Tabs>
  );
}
