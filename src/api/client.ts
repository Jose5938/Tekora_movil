import { ApiClient } from './http';

// Public configuration contains only a server address, never credentials.
export const api = new ApiClient(() => process.env.EXPO_PUBLIC_API_BASE_URL);
