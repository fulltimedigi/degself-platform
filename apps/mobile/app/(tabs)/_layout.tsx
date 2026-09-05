import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";

// Icon per tab: outline when inactive, solid when active — the standard
// iOS/Material selected-state cue. `home` is the flagship "اسأل" spark.
type IoniconName = keyof typeof Ionicons.glyphMap;
const ICONS: Record<string, { on: IoniconName; off: IoniconName }> = {
  index: { on: "home", off: "home-outline" },
  asaali: { on: "sparkles", off: "sparkles-outline" },
  search: { on: "search", off: "search-outline" },
  quote: { on: "pricetags", off: "pricetags-outline" },
  saved: { on: "heart", off: "heart-outline" },
  account: { on: "person-circle", off: "person-circle-outline" },
};

export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: tokens.color.primary,
        tabBarInactiveTintColor: tokens.color.muted,
        tabBarStyle: {
          backgroundColor: tokens.color.surface,
          borderTopColor: tokens.color.border,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
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
      <Tabs.Screen name="saved" options={{ title: t.tabs.saved }} />
      <Tabs.Screen name="account" options={{ title: t.tabs.account }} />
    </Tabs>
  );
}
