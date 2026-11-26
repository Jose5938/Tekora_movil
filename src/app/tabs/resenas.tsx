
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '@/api/client';
import {
  ApiError,
  errorMessage,
  retryDeadline,
} from '@/api/http';

import {
  isOwnReviewPage,
  isOwnReviewResource,
  publishReview,
  withdrawReview,
  type OwnReview,
  type ReviewInput,
} from '@/api/reviews';

import { resourceId } from '@/api/types';
import {
  ApiState,
  Pagination,
} from '@/components/api-state';
import { ModuleScreen } from '@/components/module-screen';
import {
  ReservationButton,
  reservationStyles as ui,
} from '@/components/reservation-ui';
import { useApiResource } from '@/hooks/use-api-resource';
import { useTekoraTheme } from '@/theme/tekora-theme';

export default function ReviewsScreen() {
  const { id, reserva } = useLocalSearchParams<{
    id?: string;
    reserva?: string;
  }>();

  const review = resourceId(id);
  const reservation = resourceId(reserva);

  // Tema global compartido.
  const { colors } = useTekoraTheme();

  return (
    <ModuleScreen
      title={
        review
          ? 'Mi reseña'
          : reservation
            ? 'Escribir reseña'
            : 'Mis reseñas'
      }
      keyboard
      themeColors={colors}
    >
      {review ? (
        <ReviewDetail
          key={review}
          id={review}
        />
      ) : reservation ? (
        <ReviewForm
          key={reservation}
          reservation={reservation}
        />
      ) : (
        <ReviewsList />
      )}
    </ModuleScreen>
  );
}

// Presentación de una reseña.
// Solo cambian los colores.
function ReviewCard({
  review,
}: {
  review: OwnReview;
}) {
  const { colors } = useTekoraTheme();

  return (
    <>
      <Text
        style={[
          ui.title,
          { color: colors.text },
        ]}
      >
        {review.service_title}
      </Text>

      <Text
        style={[
          ui.badge,
          {
            color: colors.primary,
            backgroundColor: colors.accent,
          },
        ]}
      >
        {review.rating} de 5
        {' · '}
        {review.status === 'published'
          ? 'Publicada'
          : 'Retirada'}
      </Text>

      <Text
        style={[
          ui.text,
          { color: colors.muted },
        ]}
      >
        {new Date(
          review.created_at
        ).toLocaleDateString('es-MX')}
      </Text>

      {!!review.comment && (
        <Text
          style={[
            ui.text,
            { color: colors.muted },
          ]}
        >
          {review.comment}
        </Text>
      )}
    </>
  );
}

// Listado original de reseñas.
function ReviewsList() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { colors } = useTekoraTheme();

  const reviews = useApiResource(
    `/reviews?page=${page}`,
    isOwnReviewPage,
    true
  );

  return (
    <>
      <ApiState
        {...reviews}
        empty={reviews.data?.data.length === 0}
        emptyMessage="Aún no tienes reseñas. Puedes escribir una desde una solicitud con el servicio completado."
      />

      {reviews.data?.data.map(review => (
        <View
          key={review.id}
          style={[
            ui.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <ReviewCard review={review} />

          <ReservationButton
            label="Ver reseña"
            onPress={() =>
              router.push({
                pathname: '/tabs/resenas',
                params: { id: review.id },
              })
            }
          />
        </View>
      ))}

      <Pagination
        meta={reviews.data?.meta}
        onPage={setPage}
      />

      {!!reviews.data && (
        <ReservationButton
          label="Actualizar reseñas"
          onPress={reviews.retry}
        />
      )}
    </>
  );
}

// Detalle original de una reseña.
function ReviewDetail({
  id,
}: {
  id: number;
}) {
  const router = useRouter();

  const { colors } = useTekoraTheme();

  const resource = useApiResource(
    `/reviews/${id}`,
    isOwnReviewResource,
    true
  );

  const [updated, setUpdated] =
    useState<OwnReview | null>(null);

  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pending = useRef(false);
  const retryAt = useRef(0);

  const data =
    updated ?? resource.data?.data;

  const review =
    data?.id === id ? data : null;

  // Función original para retirar una reseña.
  // No se modifica su operación.
  async function withdraw() {
    if (pending.current) return;

    if (Date.now() < retryAt.current) {
      setError(
        'Espera antes de reintentar el retiro.'
      );
      return;
    }

    pending.current = true;
    setBusy(true);
    setError('');

    try {
      setUpdated(
        await withdrawReview(api, id)
      );
      setConfirm(false);
    } catch (failure) {
      retryAt.current =
        retryDeadline(failure);

      setError(
        errorMessage(failure)
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      {!review && (
        <ApiState
          {...resource}
          error={
            data && data.id !== id
              ? new ApiError(
                  200,
                  'invalid_response',
                  'No se pudo comprobar la reseña.'
                )
              : resource.error
          }
        />
      )}

      {review && (
        <View
          style={[
            ui.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <ReviewCard review={review} />

          {/* Ver reserva original */}
          <ReservationButton
            label="Ver reserva"
            onPress={() =>
              router.push({
                pathname: '/tabs/reserva',
                params: {
                  id: review.reservation_id,
                },
              })
            }
          />

          {review.status === 'withdrawn' && (
            <Text
              style={[
                ui.text,
                { color: colors.muted },
              ]}
            >
              La reseña queda en tu historial
              privado y se retira del catálogo.
            </Text>
          )}

          {/* Confirmación original de retiro */}
          {review.status === 'published' &&
            (confirm ? (
              <>
                <Text
                  style={[
                    ui.text,
                    { color: colors.muted },
                  ]}
                >
                  Retirar la reseña la quita del
                  catálogo público. El historial
                  privado se conserva.
                </Text>

                <ReservationButton
                  label={
                    busy
                      ? 'Retirando…'
                      : 'Confirmar retiro'
                  }
                  disabled={busy}
                  onPress={() => {
                    void withdraw();
                  }}
                />

                <ReservationButton
                  label="Conservar reseña"
                  disabled={busy}
                  onPress={() => {
                    setConfirm(false);
                    setError('');
                  }}
                />
              </>
            ) : (
              <ReservationButton
                label="Retirar reseña"
                onPress={() =>
                  setConfirm(true)
                }
              />
            ))}

          {!!error && (
            <Text
              style={[
                ui.error,
                { color: colors.error },
              ]}
              accessibilityLiveRegion="polite"
            >
              {error}
            </Text>
          )}
        </View>
      )}
    </>
  );
}

// Formulario original para escribir una reseña.
function ReviewForm({
  reservation,
}: {
  reservation: number;
}) {
  const router = useRouter();

  const { colors } = useTekoraTheme();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [retry, setRetry] =
    useState<ReviewInput | null>(null);

  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pending = useRef(false);
  const retryAt = useRef(0);

  // Envío original de reseñas.
  // Conserva validaciones y protección
  // contra solicitudes duplicadas.
  async function submit() {
    if (pending.current) return;

    if (Date.now() < retryAt.current) {
      setError(
        'Espera antes de reintentar la publicación.'
      );
      return;
    }

    if (!rating) {
      setError('Selecciona una calificación.');
      return;
    }

    const input =
      retry ?? {
        rating,
        comment: comment.trim() || null,
      };

    pending.current = true;
    setBusy(true);
    setError('');

    try {
      const review = await publishReview(
        api,
        reservation,
        input
      );

      router.replace({
        pathname: '/tabs/resenas',
        params: { id: review.id },
      });
    } catch (failure) {
      retryAt.current =
        retryDeadline(failure);

      // Se conserva la misma carga útil
      // cuando no se conoce el resultado.
      if (
        failure instanceof ApiError &&
        [0, 200, 503].includes(failure.status)
      ) {
        setRetry(input);
      } else {
        setRetry(null);
      }

      setConflict(
        failure instanceof ApiError &&
          failure.status === 409
      );

      setError(
        failure instanceof ApiError
          ? failure.fields.comment?.[0] ??
              failure.fields.rating?.[0] ??
              failure.message
          : errorMessage(failure)
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <View
      style={[
        ui.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          ui.title,
          { color: colors.text },
        ]}
      >
        Valora el servicio completado
      </Text>

      <Text
        style={[
          ui.text,
          { color: colors.muted },
        ]}
      >
        Tu calificación queda fija al publicarla.
        Puedes retirar la reseña desde tu historial.
      </Text>

      {/* Calificación original de 1 a 5 */}
      <View style={styles.options}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            accessibilityRole="radio"
            accessibilityLabel={`${star} de 5`}
            accessibilityState={{
              checked: rating === star,
            }}
            disabled={
              busy || !!retry || conflict
            }
            style={[
              ui.input,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              rating === star && [
                styles.selected,
                {
                  backgroundColor: colors.accent,
                  borderColor: colors.primary,
                },
              ],
            ]}
            onPress={() =>
              setRating(star)
            }
          >
            <Text
              style={[
                ui.text,
                {
                  color:
                    rating === star
                      ? colors.primary
                      : colors.text,
                },
              ]}
            >
              {star} ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text
        style={[
          ui.text,
          { color: colors.muted },
        ]}
      >
        Comentario opcional, hasta 1.000 caracteres
      </Text>

      <TextInput
        accessibilityLabel="Comentario"
        style={[
          ui.input,
          styles.comment,
          {
            color: colors.text,
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
        placeholderTextColor={colors.muted}
        value={comment}
        onChangeText={setComment}
        multiline
        editable={
          !busy && !retry && !conflict
        }
      />

      {!!error && (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            ui.error,
            { color: colors.error },
          ]}
        >
          {error}
        </Text>
      )}

      {/* Publicación original */}
      {!conflict && (
        <ReservationButton
          label={
            busy
              ? 'Publicando…'
              : retry
                ? 'Reenviar la misma reseña'
                : 'Publicar reseña'
          }
          disabled={busy}
          onPress={() => {
            void submit();
          }}
        />
      )}

      {(conflict || retry) && (
        <ReservationButton
          label="Consultar Mis reseñas"
          onPress={() =>
            router.replace('/tabs/resenas')
          }
        />
      )}
    </View>
  );
}

// Dimensiones originales conservadas.
const styles = StyleSheet.create({
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  selected: {
    borderColor: '#005B9F',
    backgroundColor: '#E1F5FE',
  },

  comment: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
