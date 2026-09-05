import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  type ViewStyle,
  type StyleProp,
} from "react-native";

// A lightweight mount entrance: content fades in while rising a few px. Used to
// give screens a soft, premium arrival instead of a hard cut. Honors the OS
// "reduce motion" setting (renders immediately, no movement). Built on the
// native-driver Animated API — no dependency.
export function FadeInView({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setReduceMotion(v));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      p.setValue(1);
      return;
    }
    const anim = Animated.timing(p, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [p, delay, reduceMotion]);

  const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Animated.View style={[style, { opacity: p, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
