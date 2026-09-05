/**
 * Detects whether the web platform is running inside the DEGSELF native shell
 * (the React Native WebView app), as opposed to a normal browser.
 *
 * The shell tags its WebView User-Agent with `degselfApp/<version>` (see the
 * mobile app's shell/config APP_UA_MARKER). When we're inside it, the browser
 * PWA "install / add to home screen" prompts are meaningless — the user already
 * has the native app — so features can branch on this to hide them.
 */
export const NATIVE_SHELL_UA_MARKER = "degselfApp";

export function isNativeShell(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.includes(NATIVE_SHELL_UA_MARKER);
}
