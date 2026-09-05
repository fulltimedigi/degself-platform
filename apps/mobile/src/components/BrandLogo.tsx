import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet } from "react-native";
import { useTheme } from "@/theme/theme-context";

const LOGO = require("../../assets/logo-badge.png");

// The animated brand badge from the web ("دق سلف"). Mirrors the site's periodic
// flourish: once every ~6s the badge does a single slow 3D Y-flip while a light
// gleam sweeps across it, then it sits idle — a premium accent, not a busy toy.
// Respects the OS "reduce motion" setting (renders a still badge).
export function BrandLogo({ size = 64 }: { size?: number }) {
  const t = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setReduceMotion(v));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) =>
      mounted ? setReduceMotion(v) : undefined
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      t.stopAnimation();
      t.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, t]);

  const rotateY = t.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: ["0deg", "360deg", "360deg"],
  });
  const gleamX = t.interpolate({
    inputRange: [0, 0.16, 1],
    outputRange: [-size * 1.6, size * 2.6, size * 2.6],
  });
  const gleamOpacity = t.interpolate({
    inputRange: [0, 0.03, 0.16, 0.18, 1],
    outputRange: [0, 1, 1, 0, 0],
  });

  const box = { width: size, height: size, borderRadius: size / 2 };

  return (
    <Animated.View
      accessibilityRole="image"
      accessibilityLabel="دق سلف"
      style={[
        box,
        styles.badge,
        { backgroundColor: colors.background, transform: [{ perspective: 320 }, { rotateY }] },
      ]}
    >
      <Animated.Image source={LOGO} style={[box, styles.image]} resizeMode="cover" />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.gleam,
          { width: size * 0.5, height: size * 1.8, opacity: gleamOpacity, transform: [{ translateX: gleamX }, { skewX: "-18deg" }] },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { position: "absolute" },
  gleam: {
    position: "absolute",
    top: "-40%",
    left: 0,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
});
