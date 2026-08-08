import { Screen, Surface, ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";

// Saved placeholder — no favorites logic and no Supabase in M0 (favorites land
// in M1 as a direct RLS-backed feature).
export default function SavedScreen() {
  const { t } = useI18n();
  return (
    <Screen>
      <ThemedText size="xl" bold>
        {t.tabs.saved}
      </ThemedText>
      <Surface>
        <ThemedText>{t.placeholder}</ThemedText>
      </Surface>
    </Screen>
  );
}
