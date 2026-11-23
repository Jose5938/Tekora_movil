import { ApiClient, ApiError } from './http';
import { isCollection, isRecord, isResource, type Collection } from './types';

export interface PublicReview {
  rating: number;
  comment: string | null;
  month: string;
  service_id: number;
  service_title: string;
}

export interface OwnReview {
  id: number;
  reservation_id: number;
  service_id: number;
  service_title: string;
  rating: number;
  comment: string | null;
  status: 'published' | 'withdrawn';
  created_at: string;
  withdrawn_at: string | null;
}

type PublicReviewPage = Collection<PublicReview> & { meta: { average_rating: number | null } };

function id(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isRating(value: unknown): value is number {
  return id(value) && value <= 5;
}

function isPublicReview(value: unknown): value is PublicReview {
  return isRecord(value) && isRating(value.rating) && (value.comment === null || typeof value.comment === 'string') &&
    typeof value.month === 'string' && id(value.service_id) && typeof value.service_title === 'string';
}

function isOwnReview(value: unknown): value is OwnReview {
  return isRecord(value) && id(value.id) && id(value.reservation_id) && id(value.service_id) &&
    typeof value.service_title === 'string' && isRating(value.rating) &&
    (value.comment === null || typeof value.comment === 'string') &&
    (value.status === 'published' || value.status === 'withdrawn') &&
    typeof value.created_at === 'string' && Number.isFinite(Date.parse(value.created_at)) &&
    (value.withdrawn_at === null || typeof value.withdrawn_at === 'string' && Number.isFinite(Date.parse(value.withdrawn_at)));
}

export function isPublicReviewPage(value: unknown): value is PublicReviewPage {
  if (!isRecord(value) || !isRecord(value.meta)) return false;
  const { average_rating, total, per_page } = value.meta;
  return per_page === 5 && (total === 0 ? average_rating === null
    : typeof average_rating === 'number' && average_rating >= 1 && average_rating <= 5) &&
    isCollection(value, isPublicReview);
}

export const isOwnReviewPage = (value: unknown): value is Collection<OwnReview> => isCollection(value, isOwnReview);
export const isOwnReviewResource = (value: unknown): value is { data: OwnReview } => isResource(value, isOwnReview);

export type ReviewInput = { rating: number; comment: string | null };

export async function publishReview(api: ApiClient, reservation: number, input: ReviewInput): Promise<OwnReview> {
  if (!id(reservation) || !isRating(input.rating) || (input.comment !== null && [...input.comment].length > 1000)) {
    throw new ApiError(422, 'validation_failed', 'Selecciona de una a cinco estrellas. El comentario admite hasta 1.000 caracteres.');
  }
  const value = await api.request<unknown>(`/reservations/${reservation}/review`, {
    method: 'POST', authenticated: true, body: input,
  });
  if (!isOwnReviewResource(value) || value.data.reservation_id !== reservation) {
    throw new ApiError(200, 'invalid_response', 'No se pudo verificar la reseña. Consulta Mis reseñas antes de reenviar.');
  }
  return value.data;
}

export async function withdrawReview(api: ApiClient, review: number): Promise<OwnReview> {
  const value = await api.request<unknown>(`/reviews/${review}/withdraw`, { authenticated: true, method: 'PATCH' });
  if (!isOwnReviewResource(value) || value.data.id !== review || value.data.status !== 'withdrawn') {
    throw new ApiError(200, 'invalid_response', 'No se pudo comprobar el retiro. Consulta el estado de la reseña.');
  }
  return value.data;
}
