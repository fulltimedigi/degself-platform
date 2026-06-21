// Single product-analytics entry point. Forwards every event to Vercel Analytics
// (unchanged) and mirrors the high-intent ones to the Snapchat Pixel so Snap Ads
// can optimize toward people who actually search and contact garages — not just
// page views. The base Snap Pixel (init + PAGE_VIEW) lives in app/layout.tsx.
import { track as vercelTrack } from "@vercel/analytics";

type Props = Record<string, string | number | boolean | null | undefined>;

// Our internal event name → Snapchat standard event. Events not listed here are
// sent to Vercel only (kept out of Snap to avoid low-signal noise).
// Configure the Snap Ads campaign to optimize for START_CHECKOUT (= contacted a
// garage, the core conversion).
const SNAP_EVENT: Record<string, string> = {
  call: "START_CHECKOUT", // tapped the phone number — key conversion
  whatsapp: "START_CHECKOUT", // tapped WhatsApp — key conversion
  floating_widget: "START_CHECKOUT", // floating WhatsApp button — key conversion
  search: "SEARCH",
  save: "SAVE",
  view_workshop: "VIEW_CONTENT",
  translate_used: "CUSTOM_EVENT_1", // dialect translator engagement
};

declare global {
  interface Window {
    snaptr?: (...args: unknown[]) => void;
  }
}

/** Track a product event: always to Vercel Analytics, and to the Snap Pixel when mapped. */
export function track(event: string, props?: Props): void {
  vercelTrack(event, props);

  if (typeof window === "undefined" || typeof window.snaptr !== "function") return;
  const snapEvent = SNAP_EVENT[event];
  if (!snapEvent) return;

  // Snap accepts a small set of standard params — pass the ones we have so the
  // events are useful for retargeting audiences.
  const snapData: Record<string, string> = {};
  if (props?.place_id != null) snapData.item_ids = String(props.place_id);
  if (props?.query != null) snapData.search_string = String(props.query);

  window.snaptr("track", snapEvent, Object.keys(snapData).length ? snapData : undefined);
}
