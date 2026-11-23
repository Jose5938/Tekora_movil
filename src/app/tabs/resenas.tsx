import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '@/api/client';
import { ApiError, errorMessage, retryDeadline } from '@/api/http';
import { isOwnReviewPage, isOwnReviewResource, publishReview, withdrawReview, type OwnReview, type ReviewInput } from '@/api/reviews';
import { resourceId } from '@/api/types';
import { ApiState, Pagination } from '@/components/api-state';
import { ModuleScreen } from '@/components/module-screen';
import { ReservationButton, reservationStyles as ui } from '@/components/reservation-ui';
import { useApiResource } from '@/hooks/use-api-resource';

export default function ReviewsScreen() {
  const { id, reserva } = useLocalSearchParams<{ id?: string; reserva?: string }>();
  const review = resourceId(id);
  const reservation = resourceId(reserva);
  return <ModuleScreen title={review ? 'Mi reseña' : reservation ? 'Escribir reseña' : 'Mis reseñas'} keyboard>
    {review ? <ReviewDetail key={review} id={review} /> : reservation ? <ReviewForm key={reservation} reservation={reservation} /> : <ReviewsList />}
  </ModuleScreen>;
}

function ReviewCard({ review }: { review: OwnReview }) {
  return <>
    <Text style={ui.title}>{review.service_title}</Text>
    <Text style={ui.badge}>{review.rating} de 5 · {review.status === 'published' ? 'Publicada' : 'Retirada'}</Text>
    <Text style={ui.text}>{new Date(review.created_at).toLocaleDateString('es-MX')}</Text>
    {!!review.comment && <Text style={ui.text}>{review.comment}</Text>}
  </>;
}

function ReviewsList() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const reviews = useApiResource(`/reviews?page=${page}`, isOwnReviewPage, true);
  return <>
    <ApiState {...reviews} empty={reviews.data?.data.length === 0} emptyMessage="Aún no tienes reseñas. Puedes escribir una desde una solicitud con el servicio completado." />
    {reviews.data?.data.map(review => <View key={review.id} style={ui.card}>
      <ReviewCard review={review} />
      <ReservationButton label="Ver reseña" onPress={() => router.push({ pathname: '/tabs/resenas', params: { id: review.id } })} />
    </View>)}
    <Pagination meta={reviews.data?.meta} onPage={setPage} />
    {!!reviews.data && <ReservationButton label="Actualizar reseñas" onPress={reviews.retry} />}
  </>;
}

function ReviewDetail({ id }: { id: number }) {
  const router = useRouter();
  const resource = useApiResource(`/reviews/${id}`, isOwnReviewResource, true);
  const [updated, setUpdated] = useState<OwnReview | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const retryAt = useRef(0);
  const data = updated ?? resource.data?.data;
  const review = data?.id === id ? data : null;

  async function withdraw() {
    if (pending.current) return;
    if (Date.now() < retryAt.current) {
      setError('Espera antes de reintentar el retiro.');
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      setUpdated(await withdrawReview(api, id));
      setConfirm(false);
    } catch (failure) {
      retryAt.current = retryDeadline(failure);
      setError(errorMessage(failure));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <>
    {!review && <ApiState {...resource} error={data && data.id !== id
      ? new ApiError(200, 'invalid_response', 'No se pudo comprobar la reseña.') : resource.error} />}
    {review && <View style={ui.card}>
      <ReviewCard review={review} />
      <ReservationButton label="Ver reserva" onPress={() => router.push({
        pathname: '/tabs/reserva', params: { id: review.reservation_id },
      })} />
      {review.status === 'withdrawn' && <Text style={ui.text}>La reseña queda en tu historial privado y se retira del catálogo.</Text>}
      {review.status === 'published' && (confirm ? <>
        <Text style={ui.text}>Retirar la reseña la quita del catálogo público. El historial privado se conserva.</Text>
        <ReservationButton label={busy ? 'Retirando…' : 'Confirmar retiro'} disabled={busy} onPress={() => { void withdraw(); }} />
        <ReservationButton label="Conservar reseña" disabled={busy} onPress={() => { setConfirm(false); setError(''); }} />
      </> : <ReservationButton label="Retirar reseña" onPress={() => setConfirm(true)} />)}
      {!!error && <Text style={ui.error} accessibilityLiveRegion="polite">{error}</Text>}
    </View>}
  </>;
}

function ReviewForm({ reservation }: { reservation: number }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [retry, setRetry] = useState<ReviewInput | null>(null);
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const retryAt = useRef(0);

  async function submit() {
    if (pending.current) return;
    if (Date.now() < retryAt.current) {
      setError('Espera antes de reintentar la publicación.');
      return;
    }
    if (!rating) { setError('Selecciona una calificación.'); return; }
    const input = retry ?? { rating, comment: comment.trim() || null };
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const review = await publishReview(api, reservation, input);
      router.replace({ pathname: '/tabs/resenas', params: { id: review.id } });
    } catch (failure) {
      retryAt.current = retryDeadline(failure);
      // Keep the exact payload for a retry when delivery was uncertain.
      if (failure instanceof ApiError && [0, 200, 503].includes(failure.status)) setRetry(input);
      else setRetry(null);
      setConflict(failure instanceof ApiError && failure.status === 409);
      setError(failure instanceof ApiError ? failure.fields.comment?.[0] ?? failure.fields.rating?.[0] ?? failure.message
        : errorMessage(failure));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return <View style={ui.card}>
    <Text style={ui.title}>Valora el servicio completado</Text>
    <Text style={ui.text}>Tu calificación queda fija al publicarla. Puedes retirar la reseña desde tu historial.</Text>
    <View style={styles.options}>
      {[1, 2, 3, 4, 5].map(star => <TouchableOpacity key={star} accessibilityRole="radio"
        accessibilityLabel={`${star} de 5`} accessibilityState={{ checked: rating === star }}
        disabled={busy || !!retry || conflict} style={[ui.input, rating === star && styles.selected]} onPress={() => setRating(star)}>
        <Text style={ui.text}>{star} ★</Text>
      </TouchableOpacity>)}
    </View>
    <Text style={ui.text}>Comentario opcional, hasta 1.000 caracteres</Text>
    <TextInput accessibilityLabel="Comentario" style={[ui.input, styles.comment]} value={comment}
      onChangeText={setComment} multiline editable={!busy && !retry && !conflict} />
    {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
    {!conflict && <ReservationButton label={busy ? 'Publicando…' : retry ? 'Reenviar la misma reseña' : 'Publicar reseña'}
      disabled={busy} onPress={() => { void submit(); }} />}
    {(conflict || retry) && <ReservationButton label="Consultar Mis reseñas" onPress={() => router.replace('/tabs/resenas')} />}
  </View>;
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selected: { borderColor: '#005b9f', backgroundColor: '#e1f5fe' },
  comment: { minHeight: 100, textAlignVertical: 'top' },
});
