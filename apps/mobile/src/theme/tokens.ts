// Minimal DEGSELF brand token set for M0 placeholders. Values come from the
// authoritative brand (README / brand/BRAND_GUIDE.md): primary black #0A0A0A,
// accent yellow #FFD60A. This is NOT a design system and NOT a port of the web
// CSS — mobile UI is platform-native and brand-aligned. A fuller token set /
// theming lands with real product screens (M2+), not M0.

export const tokens = {
  color: {
    background: "#0A0A0A",
    surface: "#161616",
    // A subtly raised surface for cards nested inside a Surface (e.g. workshop
    // rows, example chips) so nesting reads as depth, not a flat repaint.
    surfaceRaised: "#1F1F1F",
    border: "#2A2A2A",
    foreground: "#FFFFFF",
    muted: "#9BA1A6",
    primary: "#FFD60A",
    primaryForeground: "#0A0A0A",
    // Semantic accents (previously hard-coded across screens). Kept muted for a
    // dark UI: warm terracotta for danger/error, amber for caution, green for
    // success, and WhatsApp's brand green for the one WhatsApp affordance.
    danger: "#E4795C",
    warning: "#E0B84D",
    success: "#3FB950",
    whatsapp: "#25D366",
  },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  font: { sm: 13, md: 15, lg: 18, xl: 24, xxl: 30 },
} as const;

export type Tokens = typeof tokens;
