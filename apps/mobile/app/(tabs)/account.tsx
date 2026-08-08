import { View } from "react-native";
import { ChoiceButton, Screen, Surface, ThemedText } from "@/components/primitives";
import { LOCALE_LABEL, LOCALES, useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";

// Account placeholder — NO auth in M0. Hosts the locale switcher so RTL/LTR
// behavior is demonstrable: switching to ar/ur right-aligns text; en/hi
// left-aligns. Full native layout mirroring needs an app restart (noted below).
export default function AccountScreen() {
  const { t, locale, dir, setLocale } = useI18n();
  return (
    <Screen>
      <ThemedText size="xl" bold>
        {t.tabs.account}
      </ThemedText>
      <Surface>
        <ThemedText bold>{t.languageLabel}</ThemedText>
        <View
          style={{
            flexDirection: dir === "rtl" ? "row-reverse" : "row",
            flexWrap: "wrap",
            gap: tokens.space.sm,
          }}
        >
          {LOCALES.map((l) => (
            <ChoiceButton
              key={l}
              label={LOCALE_LABEL[l]}
              selected={l === locale}
              onPress={() => setLocale(l)}
            />
          ))}
        </View>
        <ThemedText muted size="sm">
          {t.directionLabel}: {dir.toUpperCase()}
        </ThemedText>
        <ThemedText muted size="sm">
          {t.rtlReloadNote}
        </ThemedText>
      </Surface>
      <ThemedText muted>{t.placeholder}</ThemedText>
    </Screen>
  );
}
