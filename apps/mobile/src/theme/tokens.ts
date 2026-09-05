import { darkPalette } from "./palettes";

// Scheme-INDEPENDENT design tokens: spacing, radius, font sizes. Colors are now
// theme-aware — read them from useTheme().colors (see palettes.ts). `tokens.color`
// remains as the dark palette for backward-compatibility / non-themed contexts,
// but product screens should consume `colors` from the theme so light mode works.

export const tokens = {
  color: darkPalette,
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  font: { sm: 13, md: 15, lg: 18, xl: 24, xxl: 30 },
} as const;

export type Tokens = typeof tokens;
