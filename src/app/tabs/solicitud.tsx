
import { useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ApiError } from '@/api/http';
import {
  readReadiness,
  readinessLabels,
} from '@/api/confirmation';
import {
  inquiryLabels,
  inquiryPath,
  isInquiryResource,
  isJourneyResource,
  type ContractingJourney,
  type Inquiry,
} from '@/api/inquiries';
import { resourceId, type Resource } from '@/api/types';
import { ApiState } from '@/components/api-state';
import { InquiryQuotes } from '@/components/inquiry-quotes';
import { ReservationButton } from '@/components/reservation-ui';
import { useApiResource } from '@/hooks/use-api-resource';
import { useTekoraTheme } from '@/theme/tekora-theme';

const stepLabels = {
  complete: 'Completada',
  current: 'En curso',
  pending: 'Pendiente',
  stopped: 'Detenida',
};

const dateLabel = (instant: string) =>
  new Date(instant).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export default function SolicitudScreen() {
  const router = useRouter();
  const { colors } = useTekoraTheme();

  const { id } = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const inquiryId = resourceId(id);
  const path = inquiryId ? inquiryPath(inquiryId) : null;

  // Validaciones originales.
  const validateDetail = useCallback(
    (value: unknown): value is Resource<Inquiry> =>
      isInquiryResource(value) &&
      value.data.id === inquiryId,
    [inquiryId]
  );

  const validateJourney = useCallback(
    (value: unknown): value is Resource<ContractingJourney> =>
      isJourneyResource(value) &&
      value.data.inquiry.id === inquiryId,
    [inquiryId]
  );

  // Consultas originales.
  const detail = useApiResource(
    path,
    validateDetail,
    true
  );

  const journey = useApiResource(
    path && `${path}/journey`,
    validateJourney,
    true
  );

  const refresh = () => {
    detail.retry();
    journey.retry();
  };

  const unavailable = [
    detail.error,
    journey.error,
  ].some(
    error =>
      error instanceof ApiError &&
      [401, 403, 404].includes(error.status)
  );

  // Se mantiene la prioridad original del estado.
  const inquiry =
    journey.data?.data.inquiry ??
    detail.data?.data;

  const cardColors = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
    >
      {/* Cabecera original */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.iconButton}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace({
                  pathname: '/tabs/servicios',
                  params: { vista: 'historial' },
                })
          }
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.heading,
            { color: colors.text },
          ]}
        >
          Seguimiento
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Actualizar solicitud"
          style={styles.iconButton}
          onPress={refresh}
        >
          <Ionicons
            name="refresh-outline"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[
          styles.background,
          { backgroundColor: colors.background },
        ]}
        contentContainerStyle={styles.content}
      >
        {unavailable ? (
          <ApiState
            loading={false}
            retry={refresh}
            error={
              new ApiError(
                404,
                'not_found',
                'La solicitud no está disponible para esta cuenta.'
              )
            }
          />
        ) : (
          <>
            <ApiState {...detail} />

            {/* Información general */}
            {inquiry && (
              <View
                style={[
                  styles.card,
                  cardColors,
                ]}
              >
                <Text
                  style={[
                    styles.meta,
                    { color: colors.muted },
                  ]}
                >
                  Solicitud #{inquiry.id}
                  {' · '}
                  {inquiryLabels[inquiry.status]}
                </Text>

                <Text
                  style={[
                    styles.heading,
                    { color: colors.text },
                  ]}
                >
                  {inquiry.service_title}
                </Text>

                <Text
                  style={[
                    styles.body,
                    { color: colors.muted },
                  ]}
                >
                  {inquiry.message}
                </Text>

                <Text
                  style={[
                    styles.meta,
                    { color: colors.muted },
                  ]}
                >
                  {dateLabel(inquiry.created_at)}
                </Text>
              </View>
            )}

            <ApiState {...journey} />

            {journey.data && (
              <JourneyDetails
                journey={journey.data.data}
              />
            )}

            {/* Acciones comerciales originales */}
            {journey.data?.data.next_action.code ===
              'propose_schedule' &&
              journey.data.data.next_action
                .mobile_execution_available &&
              journey.data.data.commercial.can_propose && (
                <ReservationButton
                  label="Proponer horario"
                  onPress={() =>
                    router.push({
                      pathname: '/tabs/reserva',
                      params: { inquiry: inquiryId },
                    })
                  }
                />
              )}

            {journey.data?.data.reservation && (
              <ReservationButton
                label="Ver reserva actual"
                onPress={() =>
                  router.push({
                    pathname: '/tabs/reserva',
                    params: {
                      id: journey.data?.data.reservation?.id,
                    },
                  })
                }
              />
            )}

            {journey.data && (
              <ReservationButton
                label="Abrir conversación"
                onPress={() =>
                  router.push({
                    pathname: '/tabs/chat',
                    params: { inquiry: inquiryId },
                  })
                }
              />
            )}

            {inquiry && (
              <ReservationButton
                label="Ver mis reservas"
                onPress={() =>
                  router.push('/tabs/reserva')
                }
              />
            )}

            {/* Cotizaciones originales */}
            {inquiry && (
              <InquiryQuotes
                key={inquiry.id}
                inquiryId={inquiry.id}
                journey={journey.data?.data ?? null}
                refreshJourney={journey.retry}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function JourneyDetails({
  journey,
}: {
  journey: ContractingJourney;
}) {
  const router = useRouter();
  const { colors } = useTekoraTheme();

  const {
    next_action: action,
    progress,
    history,
  } = journey;

  const reference = resourceId(
    String(action.reference.id)
  );

  const canWriteReview =
    action.code === 'write_review' &&
    action.reference.type === 'reservation';

  const canViewReview =
    action.code === 'view_review' &&
    action.reference.type === 'review';

  const readiness = readReadiness(
    journey.confirmation_readiness
  );

  const cardColors = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };

  const headingColor = {
    color: colors.text,
  };

  const secondaryColor = {
    color: colors.muted,
  };

  return (
    <>
      {/* Siguiente paso */}
      <View
        style={[
          styles.card,
          cardColors,
        ]}
      >
        <Text
          style={[
            styles.heading,
            headingColor,
          ]}
        >
          Siguiente paso
        </Text>

        <Text
          style={[
            styles.action,
            { color: colors.primary },
          ]}
        >
          {action.label}
        </Text>

        <Text
          style={[
            styles.body,
            secondaryColor,
          ]}
        >
          {action.description}
        </Text>

        {journey.reservation && (
          <Text
            style={[
              styles.meta,
              secondaryColor,
            ]}
          >
            {
              readinessLabels[
                readiness?.state ?? 'unknown'
              ]
            }
          </Text>
        )}

        {action.mobile_execution_available &&
          reference &&
          (canWriteReview || canViewReview) && (
            <ReservationButton
              label={
                canWriteReview
                  ? 'Escribir reseña'
                  : 'Ver mi reseña'
              }
              onPress={() =>
                router.push({
                  pathname: '/tabs/resenas',
                  params: canWriteReview
                    ? { reserva: reference }
                    : { id: reference },
                })
              }
            />
          )}

        {action.code === 'choose_simulated_checkout' && action.interaction === 'navigate' &&
          action.mobile_execution_available && action.reference.type === 'reservation' &&
          reference && reference === journey.reservation?.id && journey.reservation.status === 'held' &&
          readiness?.state === 'simulated_checkout_required' && readiness.reservation_id === reference &&
          readiness.reservation_version === journey.reservation.version && (
            <ReservationButton
              label="Elegir método de pago de prueba"
              onPress={() => router.push({ pathname: '/tabs/pago', params: { id: reference } })}
            />
          )}

        {action.interaction === 'navigate' &&
          ![
            'read_history',
            'issue_quote',
            'review_quote',
            'propose_schedule',
            'confirm_reservation',
            'choose_simulated_checkout',
            'write_review',
            'view_review',
          ].includes(action.code) && (
            <Text
              style={[
                styles.meta,
                secondaryColor,
              ]}
            >
              {action.mobile_execution_available
                ? 'Esta acción aún no está integrada en la app.'
                : 'Esta acción solo está disponible fuera de la app.'}
            </Text>
          )}
      </View>

      {/* Progreso */}
      <View
        style={[
          styles.card,
          cardColors,
        ]}
      >
        <Text
          style={[
            styles.heading,
            headingColor,
          ]}
        >
          Progreso
        </Text>

        <Text
          style={[
            styles.meta,
            secondaryColor,
          ]}
        >
          Prestador:{' '}
          {journey.participants.provider.display_name}
        </Text>

        {progress.steps.map(step => (
          <View
            key={step.code}
            style={[
              styles.step,
              step.status === 'current' &&
                styles.current,
              step.status === 'current' && {
                backgroundColor: colors.accent,
              },
            ]}
          >
            <Text
              style={[
                styles.stepLabel,
                headingColor,
              ]}
            >
              {step.label}
            </Text>

            <Text
              style={[
                styles.meta,
                secondaryColor,
              ]}
            >
              {stepLabels[step.status]}
            </Text>
          </View>
        ))}
      </View>

      {/* Historial de contratación */}
      <View
        style={[
          styles.card,
          cardColors,
        ]}
      >
        <Text
          style={[
            styles.heading,
            headingColor,
          ]}
        >
          Historial de contratación
        </Text>

        {!history.inquiry.length &&
          !history.reservations.length && (
            <Text
              style={[
                styles.meta,
                secondaryColor,
              ]}
            >
              Todavía no hay movimientos.
            </Text>
          )}

        {history.inquiry.map(
          (event, index) => (
            <View
              key={`${event.occurred_at}-${index}`}
              style={styles.step}
            >
              <Text
                style={[
                  styles.stepLabel,
                  headingColor,
                ]}
              >
                {event.label}
              </Text>

              <Text
                style={[
                  styles.meta,
                  secondaryColor,
                ]}
              >
                {dateLabel(event.occurred_at)}
              </Text>
            </View>
          )
        )}

        {history.reservations.map(
          reservation => (
            <View
              key={reservation.id}
              style={styles.step}
            >
              <Text
                style={[
                  styles.stepLabel,
                  headingColor,
                ]}
              >
                Reserva #{reservation.id}
                {' · '}
                {reservation.label}
              </Text>

              <Text
                style={[
                  styles.meta,
                  secondaryColor,
                ]}
              >
                {reservation.local_date}
                {' · '}
                {reservation.local_start}
                –
                {reservation.local_end}
                {' '}
                ({reservation.timezone})
              </Text>
            </View>
          )
        )}
      </View>
    </>
  );
}

// Se conservan las dimensiones y posiciones originales.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  iconButton: {
    padding: 6,
  },

  background: {
    backgroundColor: '#f8f9fa',
  },

  content: {
    padding: 20,
    gap: 14,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },

  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5ecf3',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },

  heading: {
    color: '#1a1a1a',
    fontWeight: 'bold',
    fontSize: 18,
  },

  body: {
    color: '#555',
    lineHeight: 21,
  },

  meta: {
    color: '#555',
    fontSize: 13,
  },

  action: {
    color: '#005b9f',
    fontSize: 16,
    fontWeight: 'bold',
  },

  step: {
    padding: 8,
    gap: 3,
    borderRadius: 8,
  },

  stepLabel: {
    color: '#1a1a1a',
    fontWeight: '600',
  },

  current: {
    backgroundColor: '#e1f5fe',
  },
});
