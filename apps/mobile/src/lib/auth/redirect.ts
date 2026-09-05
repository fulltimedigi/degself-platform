// The single native OAuth redirect URI, used BOTH for the authorize request and
// the awaited return URL. A scheme carrying a path (`degself://auth/callback`)
// is unambiguous to the Android intent filter and to AuthSession's return-URL
// comparison, and it maps to the `app/auth/callback` route so a completed
// sign-in never lands on expo-router's "Unmatched Route" screen. It is a
// constant, not a derived value (unlike `makeRedirectUri()`, which produced the
// bare `degself://` scheme and left the return URL unmatched), so the exact
// string the Supabase redirect allowlist must contain is stable and testable.
export const GOOGLE_REDIRECT_URI = "degself://auth/callback";
