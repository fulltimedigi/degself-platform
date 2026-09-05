// Two brand palettes for the app's light and dark modes. The DEGSELF brand is
// black + yellow (#FFD60A); the accent yellow is preserved in both schemes, and
// the semantic accents are tuned per-scheme for contrast (WCAG AA on their
// backgrounds). Spacing / radius / font live in tokens.ts (scheme-independent).

export type Palette = {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  foreground: string;
  muted: string;
  primary: string;
  primaryForeground: string;
  danger: string;
  warning: string;
  success: string;
  whatsapp: string;
};

export const darkPalette: Palette = {
  background: "#0A0A0A",
  surface: "#161616",
  surfaceRaised: "#1F1F1F",
  border: "#2A2A2A",
  foreground: "#FFFFFF",
  muted: "#9BA1A6",
  primary: "#FFD60A",
  primaryForeground: "#0A0A0A",
  danger: "#E4795C",
  warning: "#E0B84D",
  success: "#3FB950",
  whatsapp: "#25D366",
};

export const lightPalette: Palette = {
  background: "#F6F7F9",
  surface: "#FFFFFF",
  surfaceRaised: "#EEF1F4",
  border: "#E1E4EA",
  foreground: "#0E1116",
  muted: "#5B626C",
  primary: "#FFD60A",
  primaryForeground: "#0A0A0A",
  danger: "#C2410C",
  warning: "#B7791F",
  success: "#2E7D32",
  whatsapp: "#25D366",
};

export type ThemeMode = "system" | "light" | "dark";
export type Scheme = "light" | "dark";

export function paletteFor(scheme: Scheme): Palette {
  return scheme === "light" ? lightPalette : darkPalette;
}
