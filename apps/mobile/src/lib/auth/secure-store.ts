import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import aesjs from "aes-js";

// Supabase-official secure session storage for React Native (the "LargeSecureStore"
// pattern). expo-secure-store (iOS Keychain / Android Keystore-backed) rejects
// values larger than ~2 KB, and a Supabase session (access JWT + refresh token +
// user object) can exceed that. So:
//   • a random AES-256 key is generated and stored in SecureStore (small, hardware-backed)
//   • the session value is AES-CTR encrypted and the CIPHERTEXT is stored in AsyncStorage
// The plaintext session therefore never touches AsyncStorage or the filesystem
// in the clear. The AES key is stored AT REST in the iOS Keychain / Android
// Keystore via expo-secure-store; to encrypt/decrypt it is necessarily loaded
// into JS memory for the duration of the operation. No hardware Secure Enclave
// guarantee is claimed — SecureStore is OS keychain-backed at rest, not an
// in-enclave compute boundary.
//
// This class is the `storage` adapter passed to createClient({ auth: { storage }}).
// AUTH SECRETS ONLY — ordinary UI/cache/guest state uses plain AsyncStorage.
//
// FAILURE MODE (inherent to the official Supabase LargeSecureStore pattern):
// setItem writes the new key to SecureStore, then the ciphertext to AsyncStorage.
// A crash BETWEEN those two writes can leave the prior ciphertext undecryptable
// (its key overwritten) → getItem returns null → a local sign-out on next launch.
// This is an accepted, non-destructive session-loss trade-off (the user simply
// re-authenticates); M1 does NOT add a custom transactional storage layer for it.

export class LargeSecureStore {
  private async encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = Crypto.getRandomValues(new Uint8Array(256 / 8));
    const cipher = new aesjs.ModeOfOperation.ctr(
      encryptionKey,
      new aesjs.Counter(1)
    );
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1)
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    try {
      return await this.decrypt(key, encrypted);
    } catch {
      // Corrupt/rotated key — treat as no session rather than crashing bootstrap.
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}
