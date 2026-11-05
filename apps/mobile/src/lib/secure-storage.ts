import * as SecureStore from 'expo-secure-store'

/** Keychain (iOS) and Keystore (Android) storage for secrets such as the API token. */
export const secureStorage = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
}
