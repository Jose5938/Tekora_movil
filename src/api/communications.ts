import { ApiError, type ApiClient } from './http';
import { inquiryLabels, inquiryPath, type InquiryStatus } from './inquiries';
import { isUuid } from './quotes';
import { isCollection, isRecord, isResource, type Collection, type Resource } from './types';

export type Conversation = { inquiry_id: number; service_title: string; status: InquiryStatus; unread_messages_count: number };
export type Message = { id: number; inquiry_id: number; is_mine: boolean; body: string; created_at: string };
export type MessagePage = {
  data: Message[];
  meta: { next_cursor: string | null; previous_cursor: string | null; read_token: string | null; unread_messages_count: number };
};
export type Notification = {
  id: string; source_type: 'inquiry' | 'activity'; source_id: number; label: string;
  created_at: string; read_at: string | null; resource: { type: 'inquiry' | 'reservation'; id: number };
};

const integer = (value: unknown, minimum = 1) => typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
const instant = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const optionalString = (value: unknown) => typeof value === 'string' || value === null;

function isConversation(value: unknown): value is Conversation {
  return isRecord(value) && integer(value.inquiry_id) && typeof value.service_title === 'string' &&
    typeof value.status === 'string' && Object.hasOwn(inquiryLabels, value.status) && integer(value.unread_messages_count, 0);
}
export const isConversations = (value: unknown): value is Collection<Conversation> => isCollection(value, isConversation);

function isMessage(value: unknown): value is Message {
  return isRecord(value) && integer(value.id) && integer(value.inquiry_id) &&
    typeof value.is_mine === 'boolean' && typeof value.body === 'string' && instant(value.created_at);
}
export function isMessagePage(value: unknown): value is MessagePage {
  return isRecord(value) && Array.isArray(value.data) && value.data.every(isMessage) && isRecord(value.meta) &&
    value.meta.per_page === 20 && optionalString(value.meta.next_cursor) && optionalString(value.meta.previous_cursor) &&
    optionalString(value.meta.read_token) && integer(value.meta.unread_messages_count, 0);
}

function isNotification(value: unknown): value is Notification {
  return isRecord(value) && (value.source_type === 'inquiry' || value.source_type === 'activity') &&
    integer(value.source_id) && value.id === `${value.source_type}:${value.source_id}` &&
    typeof value.label === 'string' && instant(value.created_at) && (value.read_at === null || instant(value.read_at)) &&
    isRecord(value.resource) && value.resource.type === (value.source_type === 'inquiry' ? 'inquiry' : 'reservation') &&
    integer(value.resource.id);
}
export const isNotifications = (value: unknown): value is Collection<Notification> => isCollection(value, isNotification);
export const isUnreadCount = (value: unknown): value is Resource<{ unread_count: number }> =>
  isResource(value, (data): data is { unread_count: number } => isRecord(data) && integer(data.unread_count, 0));

export const messagesPath = (id: number) => `${inquiryPath(id)}/messages`;
export const normalizeMessage = (body: string) => body.replace(/\r\n?/g, '\n').trim();
const invalidResponse = () => new ApiError(200, 'invalid_response', 'No se pudo comprobar el resultado de Tekora.');

export async function sendMessage(api: ApiClient, inquiryId: number, body: string, key: string) {
  const normalized = normalizeMessage(body);
  if (!integer(inquiryId) || !isUuid(key) || !normalized || Array.from(normalized).length > 2000) {
    throw new ApiError(422, 'validation_failed', 'Escribe un mensaje de entre 1 y 2000 caracteres.');
  }
  const result = await api.request<unknown>(messagesPath(inquiryId), {
    method: 'POST', authenticated: true, body: { body: normalized, idempotency_key: key },
  });
  if (!isResource(result, isMessage) || result.data.inquiry_id !== inquiryId || !result.data.is_mine) throw invalidResponse();
  return result.data;
}

export async function markMessagesRead(api: ApiClient, inquiryId: number, token: string) {
  if (!integer(inquiryId) || !token || token.length > 2048) throw new ApiError(422, 'validation_failed', 'Actualiza la conversación.');
  const result = await api.request<unknown>(`${messagesPath(inquiryId)}/read`, {
    method: 'POST', authenticated: true, body: { read_token: token },
  });
  if (!isRecord(result) || !isRecord(result.data) || !integer(result.data.last_read_message_id) ||
    result.data.inquiry_id !== inquiryId) throw invalidResponse();
}

export async function markNotificationRead(api: ApiClient, notification: Notification) {
  if (!isNotification(notification)) throw new ApiError(422, 'validation_failed', 'Actualiza la bandeja de notificaciones.');
  const result = await api.request<unknown>(`/notifications/${notification.source_type}/${notification.source_id}/read`, {
    method: 'POST', authenticated: true, body: {},
  });
  if (!isResource(result, isNotification) || result.data.id !== notification.id || !result.data.read_at) throw invalidResponse();
}
