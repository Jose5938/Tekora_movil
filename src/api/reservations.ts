import { ApiError, type ApiClient } from './http';
import { isAmount, isUuid, type Amount } from './quotes';
import { isCollection, isRecord, isResource, type Collection, type Resource } from './types';

export const reservationLabels = {
  requested: 'Espera de aceptación', held: 'Retención activa', confirmed: 'Reserva confirmada',
  hold_expired: 'Retención expirada', hold_released: 'Retención liberada', rejected: 'Reserva rechazada',
  cancelled: 'Reserva cancelada', completed: 'Servicio completado',
} as const;
type ReservationStatus = keyof typeof reservationLabels;
type Slot = { weekday: number; start_local: string; end_local: string };
export type Availability = {
  service_id: number; configured: boolean; timezone: string | null; intervals: Slot[]; blocked_dates: string[];
};
export type ReservationOptions = Availability & {
  inquiry_id: number; availability_revision: number; min_date: string; max_date: string; duration_minutes: 60;
  commercial?: { requires_accepted_quote: true; accepted_quotes: { id: string; total_cents: number }[] };
};
type ReservationIdentity = {
  id: number; inquiry_id: number; status: ReservationStatus; version: number; starts_at: string; ends_at: string; timezone: string;
};
export type Reservation = ReservationIdentity & {
  service_id: number; date: string; time: string; end_time: string;
  commercial_protocol?: 'quoted-slot-hold-v1'; quote_id?: string;
};
export type Hold = { state: 'held' | 'committed' | 'expired' | 'released'; version: number; expires_at: string; remaining_seconds: number; hold_seconds: 900 };
export type ReservationContext = {
  reservation: ReservationIdentity; client: { id: number }; service: { id: number; title: string };
  amount: Amount | null; server_now: string; hold: Hold | null;
};

const positive = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const instant = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function civilDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
export const civilTime = (value: unknown) => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

function isAvailability(value: unknown): value is Availability {
  return isRecord(value) && positive(value.service_id) && typeof value.configured === 'boolean' &&
    (value.configured ? typeof value.timezone === 'string' : value.timezone === null) &&
    Array.isArray(value.intervals) && value.intervals.every(slot => isRecord(slot) && positive(slot.weekday) &&
      Number(slot.weekday) <= 7 && civilTime(slot.start_local) && (civilTime(slot.end_local) || slot.end_local === '24:00')) &&
    Array.isArray(value.blocked_dates) && value.blocked_dates.every(civilDate);
}
export const isAvailabilityResource = (value: unknown): value is Resource<Availability> => isResource(value, isAvailability);

function isOptions(value: unknown): value is ReservationOptions {
  if (!isRecord(value) || !positive(value.inquiry_id) || !positive(value.availability_revision) ||
    !civilDate(value.min_date) || !civilDate(value.max_date) || value.duration_minutes !== 60 || !isAvailability(value)) return false;
  const commercial = (value as Record<string, unknown>).commercial;
  return commercial === undefined || (isRecord(commercial) && commercial.requires_accepted_quote === true &&
    Array.isArray(commercial.accepted_quotes) && commercial.accepted_quotes.every(quote =>
      isRecord(quote) && isUuid(quote.id) && positive(quote.total_cents) && quote.currency === 'MXN'));
}
export const isOptionsResource = (value: unknown): value is Resource<ReservationOptions> => isResource(value, isOptions);

function isIdentity(value: unknown): value is ReservationIdentity {
  return isRecord(value) && positive(value.id) && positive(value.inquiry_id) && positive(value.version) &&
    typeof value.status === 'string' && Object.hasOwn(reservationLabels, value.status) &&
    instant(value.starts_at) && instant(value.ends_at) && typeof value.timezone === 'string';
}
function isReservation(value: unknown): value is Reservation {
  return isRecord(value) && positive(value.service_id) && civilDate(value.date) && civilTime(value.time) &&
    typeof value.end_time === 'string' && (value.quote_id === undefined || isUuid(value.quote_id)) &&
    (value.commercial_protocol === undefined || value.commercial_protocol === 'quoted-slot-hold-v1') && isIdentity(value);
}
export const isReservationResource = (value: unknown): value is Resource<Reservation> => isResource(value, isReservation);
export const isReservationCollection = (value: unknown): value is Collection<Reservation> => isCollection(value, isReservation);

function isHold(value: unknown): value is Hold {
  return isRecord(value) && ['held', 'committed', 'expired', 'released'].some(state => value.state === state) &&
    positive(value.version) && instant(value.expires_at) && value.hold_seconds === 900 &&
    typeof value.remaining_seconds === 'number' && Number.isInteger(value.remaining_seconds) &&
    value.remaining_seconds >= 0 && value.remaining_seconds <= 900;
}
function isContext(value: unknown): value is ReservationContext {
  return isRecord(value) && isIdentity(value.reservation) && isRecord(value.client) && positive(value.client.id) &&
    isRecord(value.service) && positive(value.service.id) && typeof value.service.title === 'string' &&
    (value.amount === null || isAmount(value.amount)) && instant(value.server_now) && (value.hold === null || isHold(value.hold));
}
export const isContextResource = (value: unknown): value is Resource<ReservationContext> => isResource(value, isContext);

export function observedHoldSeconds(context: ReservationContext): number {
  if (context.hold?.state !== 'held') return 0;
  const seconds = (Date.parse(context.hold.expires_at) - Date.parse(context.server_now)) / 1000;
  return Math.max(0, Math.min(context.hold.remaining_seconds, Math.floor(seconds), 900));
}

export type Proposal = { date: string; time: string; availability_revision: number; quote_id?: string };
export type VersionedReservation = { version: number; idempotency_key?: string };

export async function proposeReservation(api: ApiClient, inquiryId: number, proposal: Proposal, key: string): Promise<Reservation> {
  if (!positive(inquiryId) || !civilDate(proposal.date) || !civilTime(proposal.time) ||
    !positive(proposal.availability_revision) || !isUuid(key) || (proposal.quote_id !== undefined && !isUuid(proposal.quote_id))) {
    throw new ApiError(422, 'validation_failed', 'Revisa el horario y la cotización seleccionados.');
  }
  const { date, time, availability_revision, quote_id } = proposal;
  const result = await api.request<unknown>(`/inquiries/${inquiryId}/reservations`, {
    method: 'POST', authenticated: true, body: { date, time, availability_revision, idempotency_key: key,
      ...(quote_id !== undefined ? { quote_id } : {}) },
  });
  if (!isReservationResource(result) || result.data.inquiry_id !== inquiryId) {
    throw new ApiError(200, 'invalid_response', 'No se pudo verificar la propuesta.');
  }
  return result.data;
}

export async function cancelReservation(api: ApiClient, reservation: Reservation, key?: string): Promise<Reservation> {
  if (reservation.commercial_protocol && !isUuid(key)) {
    throw new ApiError(422, 'validation_failed', 'No se pudo identificar la cancelación.');
  }
  const result = await api.request<unknown>(`/reservations/${reservation.id}/cancel`, {
    method: 'PATCH', authenticated: true, body: { version: reservation.version,
      ...(reservation.commercial_protocol && key ? { idempotency_key: key } : {}) },
  });
  if (!isReservationResource(result) || result.data.id !== reservation.id || result.data.inquiry_id !== reservation.inquiry_id ||
    result.data.status !== 'cancelled') {
    throw new ApiError(200, 'invalid_response', 'No se pudo verificar la cancelación.');
  }
  return result.data;
}
