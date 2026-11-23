import { ApiError, type ApiClient } from './http';
import { isAmount, isUuid, type Amount } from './quotes';
import { isRecord, isResource, type Resource } from './types';

export type DemoCheckoutStatus =
  | 'not_selected' | 'test_approved' | 'declined' | 'temporary_failure' | 'awaiting_cash' | 'cash_received';

export type DemoCheckout = {
  reservation_id: number;
  method: 'card' | 'cash' | null;
  status: DemoCheckoutStatus;
  reference: string | null;
  can_choose: boolean;
  can_confirm: boolean;
  amount: Amount | null;
  server_now: string;
  expires_at: string | null;
  remaining_seconds: number;
  synthetic_only: true;
};

const statuses: DemoCheckoutStatus[] = [
  'not_selected', 'test_approved', 'declined', 'temporary_failure', 'awaiting_cash', 'cash_received',
];

export function isDemoCheckout(value: unknown): value is DemoCheckout {
  return isRecord(value) && Number.isSafeInteger(value.reservation_id) && Number(value.reservation_id) > 0 &&
    (value.method === null || value.method === 'card' || value.method === 'cash') &&
    statuses.some(status => status === value.status) &&
    (value.reference === null || typeof value.reference === 'string') &&
    typeof value.can_choose === 'boolean' && typeof value.can_confirm === 'boolean' &&
    (value.amount === null || isAmount(value.amount)) &&
    typeof value.server_now === 'string' && Number.isFinite(Date.parse(value.server_now)) &&
    (value.expires_at === null || (typeof value.expires_at === 'string' &&
      Number.isFinite(Date.parse(value.expires_at)))) &&
    typeof value.remaining_seconds === 'number' && Number.isInteger(value.remaining_seconds) &&
    value.remaining_seconds >= 0 && value.remaining_seconds <= 900 && value.synthetic_only === true;
}

export const isDemoCheckoutResource = (value: unknown): value is Resource<DemoCheckout> =>
  isResource(value, isDemoCheckout);

export const demoCheckoutPath = (id: number) => '/reservations/' + id + '/demo-checkout';

export type DemoChoice = { method: 'cash' } | { method: 'card'; scenario: 'approved' | 'declined' | 'temporary_failure' };

const cards: Record<'approved' | 'declined' | 'temporary_failure', string> = {
  approved: '4242424242424242',
  declined: '4000000000000002',
  temporary_failure: '4000000000000119',
};

export async function submitDemoCheckout(api: ApiClient, reservationId: number, choice: DemoChoice, key: string): Promise<DemoCheckout> {
  if (!Number.isSafeInteger(reservationId) || reservationId < 1 || !isUuid(key)) {
    throw new ApiError(422, 'validation_failed', 'No se pudo identificar el intento de prueba.');
  }
  const body = choice.method === 'cash' ?
    { method: 'cash', idempotency_key: key } :
    { method: 'card', card_number: cards[choice.scenario], expiry: '12/30', cvv: '123', idempotency_key: key };
  const response = await api.request<unknown>(demoCheckoutPath(reservationId), {
    method: 'POST', authenticated: true, body,
  });
  if (!isDemoCheckoutResource(response) || response.data.reservation_id !== reservationId) {
    throw new ApiError(200, 'invalid_response', 'No se pudo comprobar el resultado del método de prueba.');
  }
  return response.data;
}

export function choiceLabel(status: DemoCheckoutStatus): string {
  switch (status) {
    case 'test_approved': return 'Tarjeta de prueba aprobada';
    case 'awaiting_cash': return 'Efectivo seleccionado · recepción pendiente';
    case 'cash_received': return 'Recepción ficticia de efectivo registrada';
    case 'declined': return 'La tarjeta de prueba fue rechazada';
    case 'temporary_failure': return 'Fallo temporal de prueba';
    default: return 'Sin método seleccionado';
  }
}
