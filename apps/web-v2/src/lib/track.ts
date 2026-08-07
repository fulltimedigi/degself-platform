// Single product-analytics entry point.
//
// Providers have deliberately different jobs:
// - Vercel Analytics: existing operational/product events.
// - Snapchat Pixel: existing ad-conversion optimization for mapped actions.
// - PostHog: privacy-safe product funnels using an explicit event/property
//   allow-list. It receives no raw form/search text and creates no person profile.
import { track as vercelTrack } from "@vercel/analytics";
import {
  captureProductEvent,
  type AnalyticsInput,
} from "@/lib/product-analytics";

type Props = AnalyticsInput;
type TrackOptions = {
  /** Provider-specific search text retained only for the existing Snap SEARCH event. */
  snapSearchString?: string;
};

// Our internal event name → Snapchat standard event. Events not listed here are
// kept out of Snap to avoid low-signal noise.
const SNAP_EVENT: Record<string, string> = {
  call: "START_CHECKOUT",
  whatsapp: "START_CHECKOUT",
  floating_widget: "START_CHECKOUT",
  search: "SEARCH",
  save: "SAVE",
  view_workshop: "VIEW_CONTENT",
  translate_used: "CUSTOM_EVENT_1",
};

declare global {
  interface Window {
    snaptr?: (...args: unknown[]) => void;
  }
}

/**
 * Track a product event without allowing one analytics provider to break the
 * user action or the other providers.
 */
export function track(event: string, props?: Props, options?: TrackOptions): void {
  try {
    vercelTrack(event, props);
  } catch {
    // Product behavior must not depend on analytics availability.
  }

  try {
    captureProductEvent(event, props);
  } catch {
    // Same isolation guarantee for PostHog.
  }

  if (typeof window === "undefined" || typeof window.snaptr !== "function") return;
  const snapEvent = SNAP_EVENT[event];
  if (!snapEvent) return;

  try {
    const snapData: Record<string, string> = {};
    if (props?.place_id != null) snapData.item_ids = String(props.place_id);
    if (options?.snapSearchString) snapData.search_string = options.snapSearchString;

    window.snaptr(
      "track",
      snapEvent,
      Object.keys(snapData).length ? snapData : undefined
    );
  } catch {
    // Snap failures never block navigation/contact actions.
  }
}
