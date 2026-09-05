import AsyncStorage from "@react-native-async-storage/async-storage";

// Local, device-only history of the quote requests submitted FROM THIS APP.
// Quotes are stored server-side against a phone number, not a user id, and there
// is no mobile endpoint to read them back — so "my requests" is a local record
// written on each successful submission. Newest first, capped.

const KEY = "degself.quotes.history.v1";
const CAP = 50;

export type QuoteRecord = {
  id: string | null;
  service: string;
  car: string;
  area: string;
  urgency: string;
  createdAt: number; // epoch ms
};

export async function listQuoteHistory(): Promise<QuoteRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is QuoteRecord =>
        !!r && typeof r === "object" && typeof r.createdAt === "number"
    );
  } catch {
    return [];
  }
}

export async function addQuoteHistory(rec: Omit<QuoteRecord, "createdAt">): Promise<void> {
  try {
    const current = await listQuoteHistory();
    const next: QuoteRecord[] = [{ ...rec, createdAt: Date.now() }, ...current].slice(0, CAP);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* best-effort */
  }
}

export async function clearQuoteHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}
