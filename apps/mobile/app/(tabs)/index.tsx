import { Screen, Surface, ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";

// Home placeholder — identifies DEGSELF / دق سلف and the native foundation.
// No production data.
export default function HomeScreen() {
  const { t, locale, dir } = useI18n();
  return (
    <Screen>
      <ThemedText size="xxl" bold>
        {t.appName}
      </ThemedText>
      <ThemedText muted>{t.foundation}</ThemedText>
      <Surface>
        <ThemedText>{t.placeholder}</ThemedText>
        <ThemedText muted size="sm">
          {t.directionLabel}: {dir.toUpperCase()} · {locale}
        </ThemedText>
      </Surface>
    </Screen>
  );
}
