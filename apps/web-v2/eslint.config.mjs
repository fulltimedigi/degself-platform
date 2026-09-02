// ESLint 9 flat config. Next.js 16 removed `next lint`, so linting runs via the
// ESLint CLI (`eslint .`). We compose Next's official flat presets:
//   - core-web-vitals: React + Next rules tuned for the App Router
//   - typescript:      typescript-eslint rules
// See https://nextjs.org/docs/app/api-reference/config/eslint
//
// Linting was adopted on an existing, working codebase. To make the gate useful
// immediately without a risky mass-rewrite, the high-churn / opinionated rules are
// surfaced as WARNINGS (visible, burn down incrementally) while genuine breakages
// stay ERRORS. New code should aim for zero warnings.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: [".next/**", "next-env.d.ts", "public/**", "node_modules/**"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Incremental-adoption baseline: keep these visible as warnings rather than
    // blocking, since fixing them well is a deliberate follow-up (typing external
    // data, restructuring effects) — not something to rush across the codebase.
    plugins: { "react-hooks": reactHooks, "@typescript-eslint": tsPlugin },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    // Node CJS utility scripts (data tooling, social generators) — `require` and
    // console output are expected here, not app code.
    files: ["scripts/**"],
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
];
