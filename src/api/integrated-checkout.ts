import { ApiError, type ApiClient } from './http';
import { isAmount, isUuid, type Amount } from './quotes';
import { isRecord, isResource } from './types';
import type { CheckoutDisplay } from './demo-checkout';

type Method = 'card' | 'cash';
type AttemptStatus = Exclude<CheckoutDisplay['status'], 'not_selected'>;
type Attempt = {
  reservation_id: number;
  quote_id: string;
  method: Method;
  status: AttemptStatus;
  reference: string;
  currency: 'MXN';
  amount_cents: number;
  commission_cents: number;
  provider_cents: number;
  attempted_at: string;
  received_at: string | null;
  synthetic_only: true;
};

export type IntegratedCheckout = {
  reservation_id: number;
  attempt: Attempt | null;
  synthetic_only: true;
  can_choose: boolean;
  can_confirm: boolean;
  server_now: string;
  expires_at: string | null;
};

const positiveId = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const instant = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

function isAttempt(value: unknown): value is Attempt {
  if (!isRecord(value) || !positiveId(value.reservation_id) || !isUuid(value.quote_id) ||
    !isUuid(value.reference) || !instant(value.attempted_at) || value.synthetic_only !== true) return false;
  const breakdown = {
    currency: value.currency, total_cents: value.amount_cents,
    commission_cents: value.commission_cents, provider_cents: value.provider_cents,
    commission_basis_points: 1500, commission_included: true,
  };
  if (!isAmount(breakdown) || breakdown.provider_cents !== breakdown.total_cents - breakdown.commission_cents) return false;
  if (value.method === 'card') {
    return ['test_approved', 'declined', 'temporary_failure'].some(status => status === value.status) &&
      value.received_at === null;
  }
  return value.method === 'cash' && (value.status === 'awaiting_cash' && value.received_at === null ||
    value.status === 'cash_received' && instant(value.received_at));
}

function isIntegratedCheckout(value: unknown): value is IntegratedCheckout {
  return isRecord(value) && positiveId(value.reservation_id) && value.synthetic_only === true &&
    typeof value.can_choose === 'boolean' && typeof value.can_confirm === 'boolean' &&
    instant(value.server_now) && (value.expires_at === null || instant(value.expires_at)) &&
    (value.attempt === null || (isAttempt(value.attempt) && value.attempt.reservation_id === value.reservation_id));
}

export const isIntegratedCheckoutResource = (value: unknown): value is { data: IntegratedCheckout } =>
  isResource(value, isIntegratedCheckout);

export const integratedCheckoutPath = (id: number) => `/reservations/${id}/checkout`;

function matchesQuote(attempt: Attempt, quoteId: string, expected: Amount): boolean {
  return attempt.quote_id === quoteId && attempt.currency === expected.currency &&
    attempt.amount_cents === expected.total_cents && attempt.commission_cents === expected.commission_cents &&
    attempt.provider_cents === expected.provider_cents;
}

export async function submitIntegratedCheckout(api: ApiClient, reservationId: number, quoteId: string,
  expected: Amount, method: Method, key: string): Promise<Attempt> {
  if (!positiveId(reservationId) || !isUuid(quoteId) || !isUuid(key) || (method !== 'card' && method !== 'cash')) {
    throw new ApiError(422, 'validation_failed', 'No se pudo identificar el intento de prueba.');
  }
  const result = await api.request<unknown>(integratedCheckoutPath(reservationId), {
    method: 'POST', authenticated: true,
    body: { method, idempotency_key: key, ...(method === 'card' && { instrument: 'tekora-test-card' }) },
  });
  if (!isResource(result, isAttempt) || result.data.reservation_id !== reservationId ||
    result.data.method !== method || !matchesQuote(result.data, quoteId, expected)) {
    throw new ApiError(200, 'invalid_response', 'No se pudo comprobar el resultado del método de prueba.');
  }
  return result.data;
}

export function integratedCheckoutDisplay(checkout: IntegratedCheckout, reservationStatus: CheckoutDisplay['reservation_status'],
  quoteId: string, expected: Amount): CheckoutDisplay | null {
  const attempt = checkout.attempt;
  if (attempt && !matchesQuote(attempt, quoteId, expected)) return null;
  const verified = attempt?.status === 'test_approved' || attempt?.status === 'awaiting_cash' ||
    attempt?.status === 'cash_received';
  return {
    reservation_id: checkout.reservation_id,
    reservation_status: reservationStatus,
    quote_id: attempt?.quote_id ?? null,
    selection_verified: verified,
    synthetic_only: true,
    method: attempt?.method ?? null,
    status: attempt?.status ?? 'not_selected',
    reference: attempt?.reference ?? null,
    attempted_at: attempt?.attempted_at ?? null,
    received_at: attempt?.received_at ?? null,
    amount: expected,
    can_choose: checkout.can_choose && !verified,
    can_confirm: checkout.can_confirm && verified,
  };
}
