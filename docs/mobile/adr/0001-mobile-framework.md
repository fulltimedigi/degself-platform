# ADR-0001 — Mobile framework: Expo + React Native

**Status:** Accepted · **Date:** 2026-08-08 · **Baseline:** master `f9239dd`

## Context
DEGSELF needs native Android + iOS apps on top of the existing Supabase backend, sharing the React/TypeScript skill base of `apps/web-v2` and the Arabic-first (RTL) product. A deep readiness audit (`MOBILE_READINESS_AUDIT.md`) confirmed no P0 blocker to starting a native foundation.

## Decision
Build the mobile app with **Expo (SDK 57 baseline) + React Native + TypeScript**, using Expo Router for navigation. The app is a **native client**, not a WebView wrapper.

## Alternatives considered
- **Capacitor / remote WebView wrapper — rejected.** Apple 4.2/4.2.2 rejects repackaged websites; core screens must be native. A wrapper also complicates secure token storage, native auth (Sign in with Apple), and push, and would inherit the web session-cookie model that doesn't fit native.
- **Full native Swift + Kotlin now — rejected (for now).** Doubles the surface with two codebases and skill sets DEGSELF doesn't currently staff; provides no benefit over Expo for a directory/quote/AI-chat app. Expo already exposes native APIs (secure store, notifications, maps) via config plugins/prebuild.

## Why Expo fits DEGSELF now
Reuses React/TypeScript skills; one JS codebase for both platforms; managed build/submit/OTA via EAS; first-party MIT modules for the exact native needs (secure storage, notifications, linking); official Supabase RN auth pattern exists. SDK 57 is current and New-Architecture-only.

## Consequences
- Commit to the **New Architecture** (Fabric/TurboModules) — every native dependency must be New-Arch-clean.
- Some libraries require `expo prebuild` (leaving pure managed/Expo Go) — accepted per-dependency via the adoption gate (ADR-0004).
- EAS introduces a SaaS/tooling dependency (build/submit/OTA) — a cost/lock-in factor, not a legal blocker.

## Exit conditions (would justify platform-specific native work later)
A required capability with no maintained Expo/RN module; unacceptable performance in a hot path unsolvable in RN; or a store/SDK requirement Expo cannot satisfy in time. Revisit via a new ADR if any occurs.
