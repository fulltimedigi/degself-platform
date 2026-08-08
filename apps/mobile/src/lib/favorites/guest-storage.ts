import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseFavorites, serializeFavorites } from "./favorites-sync";

// Guest favorites live in plain AsyncStorage — they are NON-SECRET place ids, so
// they must NOT sit in SecureStore (that is reserved for auth tokens). Same
// storage key semantics as the web guest store, but async.

const KEY = "degself:favorites";

export async function readGuestFavorites(): Promise<string[]> {
  try {
    return parseFavorites(await AsyncStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export async function writeGuestFavorites(ids: readonly string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, serializeFavorites(ids));
  } catch {
    /* device storage full / unavailable — keep UI responsive */
  }
}

export async function clearGuestFavorites(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
