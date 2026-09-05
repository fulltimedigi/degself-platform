import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Button, Surface, ThemedText } from "@/components/primitives";
import { useI18n } from "@/i18n";
import { tokens } from "@/theme/tokens";
import { useAuth } from "@/lib/auth/auth-context";
import { useFavorites } from "@/lib/favorites/favorites-context";
import { requestAccountDeletion } from "@/lib/account/delete-account";
import {
  ACCOUNT_DELETE_CONFIRMATION,
  deleteErrorKey,
  isValidConfirmation,
  requiresReauth,
} from "@/lib/account/account-deletion";

// Native account-deletion Danger Zone. Two steps (reveal → typed confirmation),
// the canonical translation-free token (DELETE), factual consequences, and every
// server error code mapped to localized copy. AUTH_TOO_OLD drives a provider
// reauth (never a password prompt — OAuth users have none). On success the local
// session + secure storage + guest favorites are cleared and the app returns to
// its signed-out state.

type Phase = "idle" | "confirm" | "deleting" | "done";

export function DangerZone() {
  const { t } = useI18n();
  const { getAccessToken, reauthenticate, clearLocalSession } = useAuth();
  const { resetAfterDeletion } = useFavorites();
  const [phase, setPhase] = useState<Phase>("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);

  const canConfirm = isValidConfirmation(text);

  async function onDelete() {
    setError(null);
    setNeedsReauth(false);
    setPhase("deleting");
    try {
      const token = await getAccessToken();
      if (!token) {
        setError(t.errors.deleteErrNotAuthenticated);
        setPhase("confirm");
        return;
      }
      const result = await requestAccountDeletion(token, text);
      if (result.ok) {
        // Success: purge guest favorites + local/secure session so no deleted
        // token lingers, then flip to signed-out (auth listener updates the UI).
        await resetAfterDeletion();
        await clearLocalSession();
        setPhase("done");
        return;
      }
      if (requiresReauth(result.code)) setNeedsReauth(true);
      setError(t.errors[deleteErrorKey(result.code)]);
      setPhase("confirm");
    } catch {
      setError(t.errors.deleteErrGeneric);
      setPhase("confirm");
    }
  }

  async function onReauth() {
    setError(null);
    setPhase("deleting");
    try {
      await reauthenticate();
      setNeedsReauth(false);
      setPhase("confirm");
    } catch {
      setError(t.auth.genericError);
      setPhase("confirm");
    }
  }

  if (phase === "done") {
    return (
      <Surface>
        <ThemedText bold>{t.danger.success}</ThemedText>
      </Surface>
    );
  }

  return (
    <Surface>
      <ThemedText size="lg" bold style={{ color: "#FF6B6B" }}>
        {t.danger.title}
      </ThemedText>
      <ThemedText muted size="sm">
        {t.danger.intro}
      </ThemedText>

      {phase === "idle" ? (
        <Button
          label={t.danger.deleteButton}
          variant="danger"
          onPress={() => setPhase("confirm")}
        />
      ) : (
        <View style={{ gap: tokens.space.sm }}>
          <ThemedText size="sm">{t.danger.consequences}</ThemedText>
          <ThemedText bold size="sm">
            {t.danger.typeToConfirm}
          </ThemedText>
          <TextInput
            value={text}
            onChangeText={setText}
            editable={phase !== "deleting"}
            placeholder={t.danger.confirmPlaceholder}
            placeholderTextColor={tokens.color.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel={t.danger.confirmPlaceholder}
            style={styles.input}
          />

          {error ? (
            <ThemedText size="sm" style={{ color: "#FF6B6B" }}>
              {error}
            </ThemedText>
          ) : null}

          {needsReauth ? (
            <Button
              label={t.danger.reauthButton}
              variant="secondary"
              loading={phase === "deleting"}
              onPress={onReauth}
            />
          ) : (
            <Button
              label={phase === "deleting" ? t.danger.deleting : t.danger.confirmDelete}
              variant="danger"
              disabled={!canConfirm}
              loading={phase === "deleting"}
              onPress={onDelete}
            />
          )}

          <Button
            label={t.danger.cancel}
            variant="secondary"
            disabled={phase === "deleting"}
            onPress={() => {
              setPhase("idle");
              setText("");
              setError(null);
              setNeedsReauth(false);
            }}
          />
        </View>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  input: {
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    color: tokens.color.foreground,
    fontSize: tokens.font.md,
  },
});

// Re-exported so a screen/test can reference the canonical token if needed.
export { ACCOUNT_DELETE_CONFIRMATION };
