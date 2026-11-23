import type { SessionStorage } from './session';

// SecureStore is native-only. Web previews use memory; reload requires login.
// Never fall back to localStorage, sessionStorage, cookies or AsyncStorage.
const label = `Tekora web ${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
export const sessionStorage: SessionStorage = {
  write: async () => {},
  remove: async () => {},
  deviceName: async () => label,
};
