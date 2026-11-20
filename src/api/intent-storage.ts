import * as SecureStore from 'expo-secure-store';

export const intentStorage = {
  read: SecureStore.getItemAsync,
  write: (key: string, value: string) => SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  }),
  remove: SecureStore.deleteItemAsync,
};
