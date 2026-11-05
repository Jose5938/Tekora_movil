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
