import { ApiClient, ApiError, type FieldErrors } from './http';
import { isRecord, isResource } from './types';

export type IdentityMode = 'register' | 'recover';

export function identityErrors(email: string, credentials?: { token: string; password: string; confirmation: string },
  registration?: { name: string; age: string; gender: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (email.length > 255 || !/^[\u0021-\u007e]+$/.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = ['Ingresa un correo electrónico válido.'];
  }
  if (credentials) {
    const { token, password, confirmation } = credentials;
    if (!token.trim() || token.length > 4096) errors.token = ['Pega el código completo del correo.'];
    if ([...password].length < 8 || new TextEncoder().encode(password).length > 72 || password.includes('\0')) {
      errors.password = ['Usa al menos 8 caracteres y como máximo 72 bytes UTF-8.'];
    }
    if (confirmation !== password) errors.password_confirmation = ['Las contraseñas deben coincidir.'];
  }
  if (registration) {
    if (!registration.name.trim() || registration.name.length > 255) errors.name = ['Ingresa tu nombre.'];
    if (!/^\d{1,3}$/.test(registration.age) || Number(registration.age) < 1 || Number(registration.age) > 255) {
      errors.age = ['Ingresa una edad entera entre 1 y 255.'];
    }
    if (!registration.gender) errors.gender = ['Selecciona una opción.'];
  }
  return errors;
}

export async function identityCommand(api: ApiClient, mode: IdentityMode, email: string,
  credentials?: { token: string; password: string; confirmation: string },
  registration?: { name: string; age: string; gender: string }): Promise<string> {
  const path = mode === 'register'
    ? credentials ? '/auth/register/confirm' : '/auth/register'
    : credentials ? '/auth/reset-password' : '/auth/forgot-password';
  const result = await api.request<unknown>(path, { method: 'POST', body: {
    email: email.trim().toLowerCase(),
    ...(credentials ? { token: credentials.token.trim(), password: credentials.password,
      password_confirmation: credentials.confirmation } : {}),
    ...(mode === 'register' && credentials && registration ? {
      name: registration.name.trim(), age: Number(registration.age), gender: registration.gender,
    } : {}),
  } });
  if (!isResource(result, (value): value is { message: string } =>
    isRecord(value) && typeof value.message === 'string' && value.message.length > 0)) {
    throw new ApiError(200, 'invalid_response', 'No se pudo verificar la respuesta de Tekora.');
  }
  return result.data.message;
}
