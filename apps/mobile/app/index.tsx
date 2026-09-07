import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import * as Notifications from "expo-notifications";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { APP_UA_MARKER, WEB_URL, webHost } from "@/shell/config";
import {
  classifyUrl,
  isAuthStartUrl,
  nativeAuthReturnToWebUrl,
  NATIVE_AUTH_REDIRECT_URL,
} from "@/shell/navigation";
import { registerForPush, resolveNotificationUrl } from "@/shell/push";

const BRAND_BG = "#0A0A0A";
const BRAND_YELLOW = "#FFD60A";
const HOST = webHost();

export default function ShellScreen() {
  const webRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);
  const authInFlight = useRef(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const hideSplash = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Android hardware back → walk WebView history before leaving the app.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (canGoBackRef.current) {
          webRef.current?.goBack();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [])
  );

  const onNavChange = useCallback((nav: WebViewNavigation) => {
    canGoBackRef.current = nav.canGoBack;
    setCanGoBack(nav.canGoBack);
  }, []);

  const goBack = useCallback(() => {
    if (canGoBackRef.current) webRef.current?.goBack();
  }, []);

  // Drive the WebView to a URL (same-origin) without a hard reload.
  const navigateTo = useCallback((url: string) => {
    webRef.current?.injectJavaScript(`window.location.href=${JSON.stringify(url)};true;`);
  }, []);

  // Google/Apple block OAuth inside embedded WebViews, so the sign-in flow is
  // opened in a real browser (ASWebAuthenticationSession). It returns to our
  // custom scheme with ?code=…; we then load the https callback INSIDE the
  // WebView so the PKCE code→session exchange runs in the WebView's own cookie
  // context (where signInWithOAuth stored the verifier). Without this, the
  // session lands in the external browser and the app stays logged out — which
  // also blocks the recent-auth re-login required to delete an account.
  const startOAuth = useCallback(
    async (authUrl: string) => {
      if (authInFlight.current) return;
      authInFlight.current = true;
      try {
        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          NATIVE_AUTH_REDIRECT_URL
        );
        if (result.type === "success" && result.url) {
          const webUrl = nativeAuthReturnToWebUrl(result.url, WEB_URL);
          if (webUrl) navigateTo(webUrl);
        }
      } catch {
        // Swallow — the user can retry sign-in.
      } finally {
        authInFlight.current = false;
      }
    },
    [navigateTo]
  );

  // Once the site is up, ask for push permission and register this device's token
  // with the backend. Defensive inside registerForPush — never throws.
  useEffect(() => {
    if (firstLoadDone) void registerForPush();
  }, [firstLoadDone]);

  // A tapped notification carrying a same-origin { url | path } deep-links into
  // the WebView — both while running and on a cold start from a tapped push.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = resolveNotificationUrl(response.notification.request.content.data);
      if (url) navigateTo(url);
    });
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const url = response && resolveNotificationUrl(response.notification.request.content.data);
        if (url) navigateTo(url);
      })
      .catch(() => {});
    return () => sub.remove();
  }, [navigateTo]);

  // Every navigation the WebView is about to start is classified: keep our own
  // site inside the app, hand phone/WhatsApp/maps to the OS, and open other
  // sites (and OAuth) in a real system browser tab.
  const onShouldStart = useCallback(
    (req: { url: string }) => {
      // OAuth sign-in must run in a real browser and return through our scheme.
      if (isAuthStartUrl(req.url)) {
        void startOAuth(req.url);
        return false;
      }
      const action = classifyUrl(req.url, HOST);
      if (action === "webview") return true;
      if (action === "native") {
        Linking.openURL(req.url).catch(() => {});
      } else {
        WebBrowser.openBrowserAsync(req.url, {
          toolbarColor: BRAND_BG,
          controlsColor: BRAND_YELLOW,
          dismissButtonStyle: "close",
        }).catch(() => {});
      }
      return false;
    },
    [startOAuth]
  );

  const retry = useCallback(() => {
    setError(false);
    setReloadKey((k) => k + 1);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {error ? (
        <View style={styles.center}>
          <Text style={styles.errTitle}>تعذّر الاتصال</Text>
          <Text style={styles.errBody}>تأكد من اتصالك بالإنترنت ثم أعد المحاولة.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={retry}
            style={({ pressed }) => [styles.retry, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : (
        <WebView
          key={reloadKey}
          ref={webRef}
          source={{ uri: WEB_URL }}
          originWhitelist={["http://*", "https://*"]}
          applicationNameForUserAgent={APP_UA_MARKER}
          onNavigationStateChange={onNavChange}
          onShouldStartLoadWithRequest={onShouldStart}
          onLoadEnd={() => {
            if (!firstLoadDone) {
              setFirstLoadDone(true);
              hideSplash();
            }
          }}
          onError={() => {
            setError(true);
            hideSplash();
          }}
          onHttpError={(e) => {
            // Only the main document failing is a real error; sub-resource 4xx/5xx
            // (analytics, images) must not blank the whole app.
            if (e.nativeEvent.url?.replace(/\/+$/, "") === WEB_URL) {
              setError(true);
              hideSplash();
            }
          }}
          domStorageEnabled
          javaScriptEnabled
          allowsInlineMediaPlayback
          allowsBackForwardNavigationGestures
          style={styles.web}
        />
      )}

      {/* iOS has no hardware back button, so surface a slim Back bar whenever the
          WebView has history to walk. Android keeps its system back gesture. */}
      {Platform.OS === "ios" && canGoBack && !error ? (
        <View style={styles.bottomBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={goBack}
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.backChevron}>›</Text>
            <Text style={styles.backLabel}>رجوع</Text>
          </Pressable>
        </View>
      ) : null}

      {!firstLoadDone && !error ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator size="large" color={BRAND_YELLOW} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BRAND_BG },
  web: { flex: 1, backgroundColor: BRAND_BG },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#2E2E2E",
    backgroundColor: BRAND_BG,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backChevron: { color: BRAND_YELLOW, fontSize: 22, fontWeight: "800", lineHeight: 24 },
  backLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  loading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND_BG,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: BRAND_BG,
  },
  errTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  errBody: { color: "#9BA1A6", fontSize: 14, textAlign: "center" },
  retry: {
    marginTop: 8,
    backgroundColor: BRAND_YELLOW,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: { color: BRAND_BG, fontSize: 15, fontWeight: "800" },
});
