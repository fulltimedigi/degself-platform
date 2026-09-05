import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { WEB_URL } from "./config";
import { ANDROID_CHANNEL_ID, PUSH_REGISTER_PATH, registerPayload } from "./push-core";

// Push notifications are the core native capability the WebView shell adds on top
// of the web platform — the concrete "native value" that justifies shipping the
// site as an app (App Store guideline 4.2) and lets us re-engage users when a new
// offer lands on their quote, a garage replies, etc.
//
// Pure, unit-tested helpers live in ./push-core (registerPayload,
// resolveNotificationUrl); this module owns the device/runtime side.
export { ANDROID_CHANNEL_ID, PUSH_REGISTER_PATH, resolveNotificationUrl } from "./push-core";

// Show notifications while the app is foregrounded too (banner + list), so an
// incoming offer is visible without the user having backgrounded the app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // Legacy key kept for older runtimes that still read it.
    shouldShowAlert: true,
  }),
});

function easProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId;
}

/**
 * Ask for permission, obtain an Expo push token, and register it with the
 * backend. Fully defensive: on a simulator, when permission is denied, or when
 * push credentials (FCM/APNs) aren't configured yet, it resolves to null instead
 * of throwing — the shell must never crash because push is unavailable.
 * Returns the Expo push token on success, else null.
 */
export async function registerForPush(webUrl: string = WEB_URL): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: "تنبيهات دق سلف",
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: "#FFD60A",
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted && existing.canAskAgain) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted;
    }
    if (!granted) return null;

    const projectId = easProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;
    if (!token) return null;

    await fetch(`${webUrl}${PUSH_REGISTER_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registerPayload(token, Platform.OS)),
    }).catch(() => {});

    return token;
  } catch {
    return null;
  }
}
