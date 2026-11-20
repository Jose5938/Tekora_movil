import { ApiError, type ApiClient } from './http';
import { isJourneyCommercial, isUuid, type JourneyCommercial } from './quotes';
import { isCollection, isRecord, isResource, type Collection, type Resource } from './types';

// Projections consumed by M2.2. The server remains the source of all workflow decisions.
export const inquiryLabels = {
  pending: 'Pendiente', accepted: 'Aceptada', rejected: 'Rechazada',
  cancelled: 'Cancelada', completed: 'Completada',
} as const;
export type InquiryStatus = keyof typeof inquiryLabels;

type InquirySummary = {
  id: number;
  service_id: number;
  service_title: string;
  message: string;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
};

export type Inquiry = InquirySummary & {
  accepted_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
};

const stages = ['request', 'agreement', 'schedule', 'confirmation', 'service'] as const;
type Stage = typeof stages[number];
const stepStates = ['complete', 'current', 'pending', 'stopped'] as const;
type StepState = typeof stepStates[number];
const actionCodes = [
  'read_history', 'wait_inquiry_decision', 'wait_permissions', 'confirm_reservation',
  'wait_client_confirmation', 'wait_service', 'cancel_expired_proposal', 'wait_schedule_decision',
  'view_review', 'write_review', 'review_quote', 'issue_quote', 'wait_service_availability',
  'wait_availability', 'propose_schedule',
] as const;
type ActionCode = typeof actionCodes[number];
type JourneyAction = {
  code: ActionCode;
  stage: Stage;
  label: string;
  description: string;
  reference: { type: 'inquiry' | 'quote' | 'reservation' | 'review'; id: number | string };
  interaction: 'wait' | 'navigate';
  mobile_execution_available: boolean;
};

type HistoryEvent = { label: string; occurred_at: string };
type HistoryReservation = { id: number; label: string; local_date: string; local_start: string; local_end: string; timezone: string };

export type ContractingJourney = {
  inquiry: InquirySummary & { label: string };
  viewer_role: 'client';
  participants: { provider: { id: number; display_name: string } };
  progress: { current_stage: Stage; steps: { code: Stage; label: string; status: StepState }[]; closed: boolean };
  next_action: JourneyAction;
  commercial: JourneyCommercial & { can_propose: boolean };
  reservation: { id: number; version: number; actions: string[] } | null;
  history: { inquiry: HistoryEvent[]; reservations: HistoryReservation[] };
};

function positiveId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isInstant(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function oneOf<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return choices.some(choice => value === choice);
}

function isInquirySummary(value: unknown): value is InquirySummary {
  return isRecord(value) && positiveId(value.id) && positiveId(value.service_id) &&
    typeof value.service_title === 'string' && typeof value.message === 'string' &&
    typeof value.status === 'string' && Object.hasOwn(inquiryLabels, value.status) &&
    isInstant(value.created_at) && isInstant(value.updated_at);
}

function isInquiry(value: unknown): value is Inquiry {
  return isRecord(value) && ['accepted_at', 'rejected_at', 'cancelled_at', 'completed_at'].every(
    field => value[field] === null || isInstant(value[field]),
  ) && isInquirySummary(value);
}

function isProgress(value: unknown): value is ContractingJourney['progress'] {
  if (!isRecord(value) || !oneOf(value.current_stage, stages) || typeof value.closed !== 'boolean' ||
    !Array.isArray(value.steps) || value.steps.length !== stages.length) return false;
  return value.steps.every((step, index) => isRecord(step) && step.code === stages[index] &&
    typeof step.label === 'string' && oneOf(step.status, stepStates));
}

function isAction(value: unknown): value is JourneyAction {
  if (!isRecord(value) || !isRecord(value.reference)) return false;
  const { type, id } = value.reference;
  return oneOf(value.code, actionCodes) && oneOf(value.stage, stages) &&
    typeof value.label === 'string' && typeof value.description === 'string' &&
    oneOf(value.interaction, ['wait', 'navigate']) && typeof value.mobile_execution_available === 'boolean' &&
    oneOf(type, ['inquiry', 'quote', 'reservation', 'review']) &&
    (type === 'quote' ? isUuid(id) : positiveId(id));
}

function isHistory(value: unknown): value is ContractingJourney['history'] {
  return isRecord(value) && Array.isArray(value.inquiry) && Array.isArray(value.reservations) &&
    value.inquiry.every(event => isRecord(event) && typeof event.label === 'string' && isInstant(event.occurred_at)) &&
    value.reservations.every(reservation => isRecord(reservation) && positiveId(reservation.id) &&
      typeof reservation.label === 'string' && typeof reservation.local_date === 'string' &&
      typeof reservation.local_start === 'string' && typeof reservation.local_end === 'string' &&
      typeof reservation.timezone === 'string');
}

function isJourney(value: unknown): value is ContractingJourney {
  if (!isRecord(value) || !isRecord(value.inquiry) || !isRecord(value.participants) ||
    !isRecord(value.participants.provider)) return false;
  const { provider } = value.participants;
  return value.viewer_role === 'client' && typeof value.inquiry.label === 'string' && isInquirySummary(value.inquiry) &&
    positiveId(provider.id) && typeof provider.display_name === 'string' && isProgress(value.progress) &&
    isAction(value.next_action) && isRecord(value.commercial) && typeof value.commercial.can_propose === 'boolean' &&
    isJourneyCommercial(value.commercial) && isHistory(value.history) &&
    (value.reservation === null || (isRecord(value.reservation) && positiveId(value.reservation.id) &&
      positiveId(value.reservation.version) && Array.isArray(value.reservation.actions) &&
      value.reservation.actions.every(action => typeof action === 'string')));
}

export function isInquiryCollection(value: unknown): value is Collection<Inquiry> {
  return isCollection(value, isInquiry);
}

export function isInquiryResource(value: unknown): value is Resource<Inquiry> {
  return isResource(value, isInquiry);
}

export function isJourneyResource(value: unknown): value is Resource<ContractingJourney> {
  return isResource(value, isJourney);
}

export function inquiryPath(id: number) {
  return `/inquiries/${id}`;
}

export function inquiryMessageError(value: string): string | null {
  const length = Array.from(value.trim()).length;
  return length >= 10 && length <= 2000 ? null : 'Describe lo que necesitas con entre 10 y 2000 caracteres.';
}

export async function openInquiry(api: ApiClient, serviceId: number, message: string): Promise<Inquiry> {
  const validation = inquiryMessageError(message);
  if (!positiveId(serviceId)) throw new ApiError(404, 'not_found', 'El servicio no está disponible.');
  if (validation) throw new ApiError(422, 'validation_failed', validation, { message: [validation] });
  const response = await api.request<unknown>(`/services/${serviceId}/inquiries`, {
    method: 'POST', authenticated: true, body: { message: message.trim() },
  });
  if (!isInquiryResource(response) || response.data.service_id !== serviceId) {
    throw new ApiError(200, 'invalid_response', 'Tekora no pudo comprobar la solicitud devuelta.');
  }
  return response.data;
}
