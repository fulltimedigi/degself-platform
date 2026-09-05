import AsyncStorage from "@react-native-async-storage/async-storage";

// Local, device-only contact profile used to PRE-FILL the RFQ form (name +
// WhatsApp). The app's identity is OAuth (Google/Apple) and carries no editable
// phone, so this is a convenience store — never sent anywhere except when the
// user submits a quote with these values. Kept out of Supabase on purpose.

const KEY = "degself.profile.v1";

export type Profile = { name: string; whatsapp: string };

const EMPTY: Profile = { name: "", whatsapp: "" };

export async function getProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      whatsapp: typeof parsed.whatsapp === "string" ? parsed.whatsapp : "",
    };
  } catch {
    return { ...EMPTY };
  }
}

export async function setProfile(p: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify({ name: p.name.trim().slice(0, 60), whatsapp: p.whatsapp.trim().slice(0, 15) })
    );
  } catch {
    /* best-effort; a failed write just means no prefill next time */
  }
}
