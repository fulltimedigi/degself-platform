import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  paletteFor,
  type Palette,
  type Scheme,
  type ThemeMode,
} from "./palettes";

// Live theme runtime. `mode` is the user's choice (system / light / dark),
// persisted across launches; `scheme` is the resolved light|dark actually in
// effect (following the OS when mode === "system"). Components read `colors`
// and apply them inline (StyleSheet is static, so themed colors cannot live in
// a module-scope stylesheet — see makeStyles(colors) usage across the app).

const STORAGE_KEY = "degself.theme.mode";

type ThemeContextValue = {
  mode: ThemeMode;
  scheme: Scheme;
  colors: Palette;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizeScheme(v: string | null | undefined): Scheme {
  return v === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [systemScheme, setSystemScheme] = useState<Scheme>(
    normalizeScheme(Appearance.getColorScheme())
  );

  // Follow OS appearance changes (only matters while mode === "system").
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) =>
      setSystemScheme(normalizeScheme(colorScheme))
    );
    return () => sub.remove();
  }, []);

  // Restore the persisted choice on launch.
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (mounted && (v === "light" || v === "dark" || v === "system")) {
          setModeState(v);
        }
      })
      .catch(() => {
        /* first launch / storage unavailable — keep the default */
      });
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {
      /* best-effort persistence */
    });
  }, []);

  const scheme: Scheme = mode === "system" ? systemScheme : mode;
  const colors = paletteFor(scheme);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme, colors, setMode }),
    [mode, scheme, colors, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
