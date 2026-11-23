import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';
import { ApiClient } from './http';

// Expo's native implementation enforces RequestRedirect; web uses the browser implementation.
export const api = new ApiClient(
  () => process.env.EXPO_PUBLIC_API_BASE_URL,
  (url, init) => Platform.OS === 'web' ? fetch(url, init) : expoFetch(url, init),
  {
    allowLocalHttp: __DEV__ && process.env.EXPO_PUBLIC_ALLOW_LOCAL_HTTP === '1',
    allowLocalDemoCheckout: __DEV__ && process.env.EXPO_PUBLIC_ENABLE_LOCAL_DEMO_CHECKOUT === '1',
  },
);
