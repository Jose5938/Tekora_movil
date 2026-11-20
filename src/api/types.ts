// Fernando261/tekora-project docs/api/openapi.json, commit 1f0926c.
export interface ClientUser {
  id: number;
  name: string;
  email: string;
  experience: 'client';
  permissions: ('client.appointments.view' | 'client.inquiries.manage')[];
}

export interface Provider {
  id: number;
  display_name: string;
  headline: string | null;
  bio: string | null;
}

export interface Category { id: number; name: string; slug: string }
export interface Service {
  id: number;
  title: string;
  description: string;
  modality: 'remote' | 'onsite' | 'both';
  category: Category;
  provider: Provider;
}
export interface Page {
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
}
export interface Collection<T> { data: T[]; meta: Page }
export interface Resource<T> { data: T }
export interface LoginData {
  token_type: 'Bearer';
  access_token: string;
  expires_at: string;
  user: ClientUser;
}

export const modalityLabels: Record<Service['modality'], string> = {
  remote: 'A distancia', onsite: 'Presencial', both: 'Presencial y a distancia',
};

export function resourceId(value: string | string[] | undefined): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

export function isClientUser(value: unknown): value is ClientUser {
  return isRecord(value) && positiveInteger(value.id) && typeof value.name === 'string' &&
    typeof value.email === 'string' && value.experience === 'client' &&
    Array.isArray(value.permissions) && value.permissions.every(permission =>
      permission === 'client.appointments.view' || permission === 'client.inquiries.manage');
}

export function isLoginData(value: unknown): value is LoginData {
  return isRecord(value) && value.token_type === 'Bearer' && typeof value.access_token === 'string' &&
    value.access_token.trim().length > 0 && typeof value.expires_at === 'string' &&
    Number.isFinite(Date.parse(value.expires_at)) && isClientUser(value.user);
}

export function isProvider(value: unknown): value is Provider {
  return isRecord(value) && positiveInteger(value.id) && typeof value.display_name === 'string' &&
    nullableString(value.headline) && nullableString(value.bio);
}

export function isService(value: unknown): value is Service {
  if (!isRecord(value) || !isRecord(value.category)) return false;
  const { category } = value;
  return positiveInteger(value.id) && typeof value.title === 'string' && typeof value.description === 'string' &&
    (value.modality === 'remote' || value.modality === 'onsite' || value.modality === 'both') &&
    positiveInteger(category.id) && typeof category.name === 'string' && typeof category.slug === 'string' &&
    isProvider(value.provider);
}

export function isResource<T>(value: unknown, isData: (data: unknown) => data is T): value is Resource<T> {
  return isRecord(value) && isData(value.data);
}

export function isCollection<T>(value: unknown, isItem: (item: unknown) => item is T): value is Collection<T> {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.meta)) return false;
  const { current_page, per_page, last_page, total } = value.meta;
  return positiveInteger(current_page) && positiveInteger(per_page) && per_page <= 50 &&
    positiveInteger(last_page) && typeof total === 'number' && Number.isSafeInteger(total) && total >= 0 &&
    value.data.every(isItem);
}

export function isProviderCollection(value: unknown): value is Collection<Provider> {
  return isCollection(value, isProvider);
}

export function isServiceCollection(value: unknown): value is Collection<Service> {
  return isCollection(value, isService);
}

export function isProviderResource(value: unknown): value is Resource<Provider> {
  return isResource(value, isProvider);
}

export function isServiceResource(value: unknown): value is Resource<Service> {
  return isResource(value, isService);
}
