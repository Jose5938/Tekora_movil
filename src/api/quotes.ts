import { ApiError, type ApiClient } from './http';
import { isCollection, isRecord, isResource, type Collection, type Resource } from './types';

export type Amount = {
  currency: 'MXN'; total_cents: number; commission_cents: number; provider_cents: number;
  commission_included: true; commission_basis_points: 1500;
};
type QuoteState = 'pending' | 'expired' | 'accepted';
export type QuoteAcceptance = {
  quote_id: string; state: QuoteState; accepted_at: string | null; server_now: string;
};
export type CommercialQuote = {
  id: string; inquiry_id: number; service_id: number; provider_id: number; client_id: number;
  price_version: number; amount: Amount; issued_at: string; expires_at: string;
  acceptance_window_expired: boolean; acceptance: QuoteAcceptance; server_now: string;
};

export type JourneyCommercial = {
  mode: 'quoted' | 'legacy'; can_issue: boolean;
  quote: { id: string; state: QuoteState } | null; agreed_amount: Amount | null;
};

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
}

const integer = (value: unknown, min: number) => typeof value === 'number' && Number.isSafeInteger(value) && value >= min;
const instant = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const quoteState = (value: unknown) => value === 'pending' || value === 'expired' || value === 'accepted';

export function isAmount(value: unknown): value is Amount {
  return isRecord(value) && value.currency === 'MXN' && value.commission_basis_points === 1500 &&
    value.commission_included === true && integer(value.total_cents, 1) &&
    integer(value.commission_cents, 0) && integer(value.provider_cents, 0);
}

export function isJourneyCommercial(value: unknown): value is JourneyCommercial {
  return isRecord(value) && (value.mode === 'quoted' || value.mode === 'legacy') &&
    typeof value.can_issue === 'boolean' && (value.agreed_amount === null || isAmount(value.agreed_amount)) &&
    (value.quote === null || (isRecord(value.quote) && isUuid(value.quote.id) && quoteState(value.quote.state)));
}

function isQuoteAcceptance(value: unknown): value is QuoteAcceptance {
  return isRecord(value) && isUuid(value.quote_id) && quoteState(value.state) &&
    (value.state === 'accepted' ? instant(value.accepted_at) : value.accepted_at === null) && instant(value.server_now);
}

function isQuote(value: unknown): value is CommercialQuote {
  return isRecord(value) && isUuid(value.id) && integer(value.inquiry_id, 1) && integer(value.service_id, 1) &&
    integer(value.provider_id, 1) && integer(value.client_id, 1) && integer(value.price_version, 1) &&
    isAmount(value.amount) && instant(value.issued_at) && instant(value.expires_at) && instant(value.server_now) &&
    typeof value.acceptance_window_expired === 'boolean' && isQuoteAcceptance(value.acceptance) &&
    value.acceptance.quote_id === value.id;
}

export function isQuoteCollection(value: unknown): value is Collection<CommercialQuote> {
  return isCollection(value, isQuote);
}
export function isQuoteResource(value: unknown): value is Resource<CommercialQuote> {
  return isResource(value, isQuote);
}

export const quotesPath = (inquiryId: number) => `/inquiries/${inquiryId}/quotes`;
export const quotePath = (id: string) => `/quotes/${id}`;

function invalidResponse(): ApiError {
  return new ApiError(200, 'invalid_response', 'No se pudo comprobar la cotización devuelta.');
}

export async function issueQuote(api: ApiClient, inquiryId: number, key: string): Promise<CommercialQuote> {
  if (!integer(inquiryId, 1) || !isUuid(key)) throw new ApiError(422, 'validation_failed', 'La solicitud de cotización no es válida.');
  const result = await api.request<unknown>(quotesPath(inquiryId), {
    method: 'POST', authenticated: true, body: { idempotency_key: key },
  });
  if (!isQuoteResource(result) || result.data.inquiry_id !== inquiryId) throw invalidResponse();
  return result.data;
}

export async function acceptQuote(api: ApiClient, id: string): Promise<CommercialQuote> {
  if (!isUuid(id)) throw new ApiError(404, 'not_found', 'No se encontró la cotización solicitada.');
  const result = await api.request<unknown>(`${quotePath(id)}/accept`, {
    method: 'POST', authenticated: true, body: { acknowledge: true },
  });
  if (!isQuoteResource(result) || result.data.id !== id || result.data.acceptance.state !== 'accepted') throw invalidResponse();
  return result.data;
}

const formatMxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', currencyDisplay: 'code' });
export const mxn = (cents: number) => formatMxn.format(cents / 100);
