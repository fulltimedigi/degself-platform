import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseFavorites, serializeFavorites } from "./favorites-sync";

const KEY = "degself:favorites";

export async function readGuestFavorites(): Promise<string[]> {
  try {
    return parseFavorites(await AsyncStorage.getItem(KEY));
  } catch {
    return [];
  }
}

/**
 * Persist guest favorites and report whether the write really succeeded. The
 * caller can then roll back an optimistic UI update instead of claiming a save
 * that will disappear on restart when device storage is unavailable/full.
 */
export async function writeGuestFavorites(
  ids: readonly string[]
): Promise<boolean> {
  try {
    await AsyncStorage.setItem(KEY, serializeFavorites(ids));
    return true;
  } catch {
    return false;
  }
}

export async function clearGuestFavorites(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}
