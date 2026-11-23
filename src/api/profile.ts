import { ApiClient, ApiError, isPhotoMime, PROFILE_PHOTO_LIMIT } from './http';
import { isRecord, isResource } from './types';

export interface Profile {
  id: number;
  name: string;
  email: string;
  age: number;
  gender: string;
  email_verified: boolean;
  photo_url: '/api/v1/me/photo' | null;
}

export function isProfileResource(value: unknown): value is { data: Profile } {
  return isResource(value, (data): data is Profile =>
    isRecord(data) && typeof data.id === 'number' && Number.isSafeInteger(data.id) && data.id > 0 &&
    typeof data.name === 'string' && typeof data.email === 'string' && typeof data.age === 'number' &&
    Number.isInteger(data.age) && typeof data.gender === 'string' && typeof data.email_verified === 'boolean' &&
    (data.photo_url === null || data.photo_url === '/api/v1/me/photo'));
}

export function photoInputError(mime: string, size: number): string | null {
  if (!isPhotoMime(mime)) return 'Selecciona una imagen JPEG, PNG o WebP.';
  if (!Number.isSafeInteger(size) || size < 1 || size > PROFILE_PHOTO_LIMIT) return 'La foto debe ocupar hasta 2 MiB.';
  return null;
}

export function acceptedProfile(value: unknown, owner: number): Profile {
  if (!isProfileResource(value) || value.data.id !== owner) {
    throw new ApiError(200, 'invalid_response', 'No se pudo comprobar el perfil de esta cuenta.');
  }
  return value.data;
}

export async function saveProfileName(api: ApiClient, owner: number, name: string): Promise<Profile> {
  const trimmed = name.trim();
  if (!trimmed || [...trimmed].length > 255) throw new ApiError(422, 'validation_failed', 'Ingresa un nombre de hasta 255 caracteres.');
  return acceptedProfile(await api.request('/me/profile', {
    authenticated: true, method: 'PATCH', body: { name: trimmed },
  }), owner);
}

// The private image stays in memory. Passing a URI from the API to an image
// component would bypass the authenticated transport and its redirect checks.
export function photoDataUri(mime: string, bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const result: string[] = [];
  let block = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1] ?? 0, c = bytes[i + 2] ?? 0;
    block += alphabet[a >> 2] + alphabet[(a & 3) << 4 | b >> 4] +
      (i + 1 < bytes.length ? alphabet[(b & 15) << 2 | c >> 6] : '=') +
      (i + 2 < bytes.length ? alphabet[c & 63] : '=');
    if (block.length >= 8192) { result.push(block); block = ''; }
  }
  return `data:${mime};base64,${result.join('')}${block}`;
}
