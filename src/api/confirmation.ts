import { ApiError, type ApiClient } from './http';
import { isUuid } from './quotes';
import { isReservationResource, observedHoldSeconds, type Reservation, type ReservationContext } from './reservations';
import { isRecord } from './types';

export const readinessLabels = {
  awaiting_provider: 'En espera de aceptación del prestador',
  ready: 'El horario está retenido. Falta confirmar la contratación.',
  web_checkout_required: 'Esta reserva requiere un paso fuera de la app.',
  hold_expired: 'El plazo de retención terminó.',
  hold_released: 'El horario retenido fue liberado.',
  already_confirmed: 'El servidor registra la reserva como confirmada.',
  cancelled: 'La reserva fue cancelada.', rejected: 'La reserva fue rechazada.',
  completed: 'El servicio figura como completado.',
  blocked: 'La confirmación no está disponible en este estado.',
  not_applicable: 'La reserva usa un flujo sin confirmación B2.',
  unknown: 'No se pudo verificar si la reserva puede confirmarse.',
} as const;

type ReadinessState = keyof typeof readinessLabels;
type Readiness = {
  state: ReadinessState; can_offer_mobile_confirmation: boolean;
  reservation_id: number; reservation_version: number; observed_at: string;
};
const positive = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

export function readReadiness(value: unknown): Readiness | null {
  if (!isRecord(value) || typeof value.state !== 'string' || !Object.hasOwn(readinessLabels, value.state) ||
    value.can_offer_mobile_confirmation !== (value.state === 'ready') || value.advisory_only !== true ||
    !positive(value.reservation_id) || !positive(value.reservation_version) || typeof value.observed_at !== 'string' ||
    !Number.isFinite(Date.parse(value.observed_at))) return null;
  if (value.state === 'ready' && (!(value.synthetic_web_requirement === 'not_applicable' || value.synthetic_web_requirement === 'satisfied') ||
    !Array.isArray(value.blocking_reasons) || value.blocking_reasons.length > 0)) return null;
  return value as Readiness;
}

function matches(readiness: Readiness | null, reservation: Reservation) {
  return readiness?.state === 'ready' && readiness.can_offer_mobile_confirmation &&
    readiness.reservation_id === reservation.id && readiness.reservation_version === reservation.version;
}

export function canConfirmReservation(
  reservation: Reservation, context: ReservationContext | undefined, journeyReadiness: unknown, seconds: number | undefined,
) {
  if (!context || !seconds || seconds <= 0 || reservation.status !== 'held' || context.reservation.status !== 'held' ||
    reservation.commercial_protocol !== 'quoted-slot-hold-v1' || context.reservation.id !== reservation.id ||
    context.reservation.inquiry_id !== reservation.inquiry_id || context.reservation.version !== reservation.version ||
    reservation.hold?.state !== 'held' || context.hold?.state !== 'held' ||
    reservation.hold.version !== context.hold.version || Date.parse(reservation.hold.expires_at) !== Date.parse(context.hold.expires_at) ||
    observedHoldSeconds(context) <= 0) return false;
  const readiness = readReadiness(context.confirmation_readiness);
  return readiness?.observed_at === context.server_now && matches(readiness, reservation) &&
    matches(readReadiness(journeyReadiness), reservation);
}

export async function commitReservation(api: ApiClient, reservation: Reservation, key: string): Promise<Reservation> {
  if (reservation.commercial_protocol !== 'quoted-slot-hold-v1' || !isUuid(key)) {
    throw new ApiError(422, 'validation_failed', 'No se pudo identificar la confirmación.');
  }
  const result = await api.request<unknown>(`/reservations/${reservation.id}/commit`, {
    method: 'PATCH', authenticated: true, body: { version: reservation.version, idempotency_key: key },
  });
  if (!isReservationResource(result) || result.data.id !== reservation.id || result.data.inquiry_id !== reservation.inquiry_id) {
    throw new ApiError(200, 'invalid_response', 'No se pudo comprobar el resultado de la confirmación.');
  }
  return result.data;
}
