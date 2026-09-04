import type { Workshop } from "./types";

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function internationalPhoneDigits(value: string): string {
  const digits = digitsOnly(value);
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.length === 8) return `965${digits}`;
  return digits;
}

export function callUrl(workshop: Workshop): string | null {
  const raw = workshop.phone_intl || workshop.phone;
  if (!raw) return null;
  const digits = internationalPhoneDigits(raw);
  return digits ? `tel:+${digits}` : null;
}

export function whatsappUrl(workshop: Workshop): string | null {
  const raw = workshop.phone_intl || workshop.phone;
  if (!raw) return null;
  const digits = internationalPhoneDigits(raw);
  return digits ? `https://wa.me/${digits}` : null;
}

export function mapUrl(workshop: Workshop): string {
  if (workshop.lat != null && workshop.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${workshop.lat},${workshop.lng}`;
  }
  const query = [workshop.name, workshop.address, workshop.area].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function safeWebsiteUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
