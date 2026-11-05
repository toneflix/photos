/** Browser storage for the web preview of the app, which has no keychain. */
export const secureStorage = {
  get: async (key: string) => localStorage.getItem(key),
  set: async (key: string, value: string) => localStorage.setItem(key, value),
  remove: async (key: string) => localStorage.removeItem(key),
}
