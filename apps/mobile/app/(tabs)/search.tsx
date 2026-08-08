import { Screen, Surface, ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";

// Search placeholder — no query logic, no Supabase, no ranking in M0.
export default function SearchScreen() {
  const { t } = useI18n();
  return (
    <Screen>
      <ThemedText size="xl" bold>
        {t.tabs.search}
      </ThemedText>
      <Surface>
        <ThemedText>{t.placeholder}</ThemedText>
      </Surface>
    </Screen>
  );
}
