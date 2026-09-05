import { useCallback, useRef, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { APP_UA_MARKER, WEB_URL, webHost } from "@/shell/config";
import { classifyUrl } from "@/shell/navigation";

const BRAND_BG = "#0A0A0A";
const BRAND_YELLOW = "#FFD60A";
const HOST = webHost();

export default function ShellScreen() {
  const webRef = useRef<WebView>(null);
  const canGoBack = useRef(false);
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
        if (canGoBack.current) {
          webRef.current?.goBack();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [])
  );

  const onNavChange = useCallback((nav: WebViewNavigation) => {
    canGoBack.current = nav.canGoBack;
  }, []);

  // Every navigation the WebView is about to start is classified: keep our own
  // site inside the app, hand phone/WhatsApp/maps to the OS, and open other
  // sites (and OAuth) in a real system browser tab.
  const onShouldStart = useCallback((req: { url: string }) => {
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
  }, []);

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
          style={styles.web}
        />
      )}

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
