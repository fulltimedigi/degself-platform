"use client";

import { track } from "@vercel/analytics";
import { Phone } from "lucide-react";

const WA_TEXT = "السلام عليكم، لقيتكم على دق سلف وحاب أستفسر عن الخدمة";

/** Compact call + WhatsApp actions for a workshop card (tap-to-act from results). */
export function CardActions({
  tel,
  waDigits,
  placeId,
}: {
  tel?: string | null;
  waDigits?: string | null;
  placeId: string;
}) {
  if (!tel && !waDigits) return null;
  return (
    <div className="flex gap-2">
      {tel && (
        <a
          href={`tel:${tel}`}
          onClick={(e) => {
            e.stopPropagation();
            track("call", { place_id: placeId });
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm font-semibold text-primary transition hover:bg-muted"
        >
          <Phone size={15} aria-hidden />
          اتصال
        </a>
      )}
      {waDigits && (
        <a
          href={`https://wa.me/${waDigits}?text=${encodeURIComponent(WA_TEXT)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            track("whatsapp", { place_id: placeId });
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-sm font-bold text-white transition hover:bg-green-700"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
            <path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.9 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.8.97h.004a7.94 7.94 0 0 0 5.6-13.55zM12.05 18.5a6.56 6.56 0 0 1-3.34-.92l-.24-.14-2.49.65.66-2.43-.16-.25a6.59 6.59 0 1 1 5.57 3.09zm3.62-4.93c-.2-.1-1.17-.58-1.35-.64-.18-.07-.31-.1-.44.1-.13.2-.5.64-.62.77-.11.13-.23.15-.43.05a5.4 5.4 0 0 1-1.59-.98 6 6 0 0 1-1.1-1.37c-.11-.2-.01-.3.09-.4.09-.09.2-.23.3-.35.1-.12.13-.2.2-.34.07-.13.03-.25-.02-.35-.05-.1-.44-1.07-.6-1.46-.16-.38-.32-.33-.44-.34l-.37-.01a.72.72 0 0 0-.52.24c-.18.2-.68.67-.68 1.62 0 .96.7 1.88.8 2.01.1.13 1.38 2.1 3.34 2.95.47.2.83.32 1.11.41.47.15.9.13 1.23.08.38-.06 1.17-.48 1.33-.94.16-.46.16-.85.11-.94-.05-.08-.18-.13-.38-.23z" />
          </svg>
          واتساب
        </a>
      )}
    </div>
  );
}
