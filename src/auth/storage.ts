import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { SessionStorage } from './session';

const SESSION_KEY = 'tekora.mobile.session';
const DEVICE_KEY = 'tekora.mobile.device';
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export const sessionStorage: SessionStorage = {
  read: () => SecureStore.getItemAsync(SESSION_KEY),
  write: value => SecureStore.setItemAsync(SESSION_KEY, value, options),
  remove: () => SecureStore.deleteItemAsync(SESSION_KEY),
  async deviceName() {
    const saved = await SecureStore.getItemAsync(DEVICE_KEY);
    if (saved) return saved;
    // Installation label only: not an authentication secret or a hardware ID.
    const label = `Tekora ${Platform.OS} ${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    await SecureStore.setItemAsync(DEVICE_KEY, label, options);
    return label;
  },
};
