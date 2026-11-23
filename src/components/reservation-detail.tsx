import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '@/api/client';
import { ApiError, errorMessage } from '@/api/http';
import { canConfirmReservation, commitReservation, readReadiness, readinessLabels } from '@/api/confirmation';
import { inquiryPath, isJourneyResource, type ContractingJourney } from '@/api/inquiries';
import { mxn } from '@/api/quotes';
import { cancelReservation, isContextResource, isReservationResource, observedHoldSeconds,
  reservationLabels, type Reservation, type ReservationContext } from '@/api/reservations';
import { finishCommandIntent, commandIntent, reservationScope } from '@/api/command-intent';
import type { Resource } from '@/api/types';
import { useSession } from '@/auth/context';
import { ApiState } from '@/components/api-state';
import { ReservationButton, reservationStyles as styles } from '@/components/reservation-ui';
import { useApiResource } from '@/hooks/use-api-resource';

function useRemainingHold(context: ReservationContext | undefined) {
  const [clock, setClock] = useState<{ context: ReservationContext; seconds: number }>();
  const deadline = useRef<{ key: string; time: number } | undefined>(undefined);
  useEffect(() => {
    if (!context || context.hold?.state !== 'held') return;
    const key = `${context.client.id}:${context.reservation.id}:${context.hold.expires_at}`;
    const candidate = performance.now() + observedHoldSeconds(context) * 1000;
    const time = deadline.current?.key === key ? Math.min(candidate, deadline.current.time) : candidate;
    deadline.current = { key, time };
    const tick = () => setClock({ context, seconds: Math.max(0, Math.ceil((time - performance.now()) / 1000)) });
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 250);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [context]);
  const active = useCallback(() => !!deadline.current && performance.now() < deadline.current.time, []);
  return { seconds: context && clock?.context === context ? clock.seconds : undefined, active };
}

export function ReservationDetail({ id }: { id: number }) {
  const router = useRouter();
  const { user } = useSession();
  const [decision, setDecision] = useState<'cancel' | 'commit'>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const focused = useRef(false);
  const sending = useRef(false);
  const validate = useCallback((value: unknown): value is Resource<Reservation> =>
    isReservationResource(value) && value.data.id === id, [id]);
  const detail = useApiResource(`/reservations/${id}`, validate, true);
  const reservation = detail.data?.data;
  const inquiryId = reservation?.inquiry_id;
  const validateContext = useCallback((value: unknown): value is Resource<ReservationContext> =>
    isContextResource(value) && value.data.reservation.id === id && value.data.reservation.inquiry_id === inquiryId &&
    value.data.client.id === user?.id, [id, inquiryId, user?.id]);
  const context = useApiResource(reservation?.commercial_protocol ? `/reservations/${id}/checkout-context` : null, validateContext, true);
  const validateJourney = useCallback((value: unknown): value is Resource<ContractingJourney> =>
    isJourneyResource(value) && value.data.inquiry.id === inquiryId, [inquiryId]);
  const journey = useApiResource(inquiryId ? `${inquiryPath(inquiryId)}/journey` : null, validateJourney, true);
  // Keep the focus callback stable while the dependent request paths become available.
  // If a retry temporarily clears reservation data, context and journey paths become null:
  // depending on their retry functions here would re-run the focus effect indefinitely.
  const latestRetry = useRef({ detail: detail.retry, context: context.retry, journey: journey.retry });
  useEffect(() => {
    latestRetry.current = { detail: detail.retry, context: context.retry, journey: journey.retry };
  }, [detail.retry, context.retry, journey.retry]);
  const hasFocused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    // Initial mount already fetches all resources. Refresh only on a later focus.
    if (hasFocused.current) {
      latestRetry.current.detail();
      latestRetry.current.context();
      latestRetry.current.journey();
    }
    hasFocused.current = true;
    return () => { focused.current = false; };
  }, []));
  const current = journey.data?.data.reservation;
  const canCancel = !!reservation && current?.id === id && current.version === reservation.version && current.actions.includes('cancel');
  const observed = context.data?.data.reservation.version === reservation?.version ? context.data?.data : undefined;
  const { seconds, active } = useRemainingHold(observed);
  const readiness = readReadiness(observed?.confirmation_readiness);
  const canCommit = !!reservation && current?.id === id && current.actions.includes('commit') &&
    canConfirmReservation(reservation, observed, journey.data?.data.confirmation_readiness, seconds);

  function refresh() {
    setDecision(undefined);
    detail.retry();
    context.retry();
    journey.retry();
  }

  async function send(action: 'cancel' | 'commit') {
    if (!user || !reservation || decision !== action || sending.current || !focused.current ||
      (action === 'commit' ? !canCommit : !canCancel)) return;
    const scope = reservationScope(user.id, action, id);
    sending.current = true;
    setBusy(true);
    setDecision(undefined);
    try {
      if (action === 'commit') {
        const fresh = await api.request<unknown>(`/reservations/${id}/checkout-context`, { authenticated: true });
        if (!validateContext(fresh) || !active() ||
          !canConfirmReservation(reservation, fresh.data, journey.data?.data.confirmation_readiness, seconds)) {
          throw new ApiError(409, 'conflict', 'La reserva cambió. Actualiza el estado antes de confirmar.');
        }
      }
      if (!focused.current) return;
      const key = reservation.commercial_protocol ? await commandIntent(scope, { version: reservation.version }) : undefined;
      if (!focused.current) return;
      if (action === 'commit' && (!key || !active())) {
        throw new ApiError(409, 'conflict', 'Terminó el plazo de la retención. Actualiza el estado.');
      }
      const result = action === 'commit' ? await commitReservation(api, reservation, key!) :
        await cancelReservation(api, reservation, key);
      await finishCommandIntent(scope);
      if (focused.current) {
        setNotice(action === 'cancel' ? 'Reserva cancelada.' :
          result.status === 'confirmed' ? 'Contratación confirmada por Tekora.' :
            `Estado informado por Tekora: ${reservationLabels[result.status]}.`);
      }
    } catch (error) {
      if (error instanceof ApiError && [409, 422].includes(error.status)) await finishCommandIntent(scope);
      if (focused.current) {
        const uncertain = !(error instanceof ApiError) || error.status >= 500 ||
          ['network', 'invalid_response'].includes(error.code);
        setNotice(uncertain ? 'No se pudo comprobar la operación. Consulta el estado antes de repetirla.' : errorMessage(error));
      }
    } finally {
      if (focused.current) refresh();
      sending.current = false;
      setBusy(false);
    }
  }

  return <View style={styles.card}>
    <ApiState {...detail} />
    {reservation && <>
      <Text style={styles.title}>Reserva #{id}</Text>
      <Text style={styles.badge}>{reservationLabels[reservation.status]}</Text>
      <Text style={styles.text}>{reservation.date} · {reservation.time}–{reservation.end_time} ({reservation.timezone})</Text>
      <Text style={styles.text}>Versión de reserva: {reservation.version}</Text>
      {reservation.commercial_protocol && <ApiState {...context} />}
      {observed?.amount && <Text style={styles.text}>Importe acordado: {mxn(observed.amount.total_cents)}</Text>}
      {observed?.hold?.state === 'held' && <>
        <Text style={styles.badge}>{seconds === undefined ? 'Consultando plazo de retención…' : seconds > 0 ? `${seconds} s de retención restantes` : 'Plazo de retención agotado · Actualiza el estado'}</Text>
        <Text style={styles.text}>El plazo original es de 900 segundos. Volver a consultar no lo amplía.</Text>
      </>}
      <ApiState {...journey} />
      {notice && <Text accessibilityLiveRegion="polite" style={styles.text}>{notice}</Text>}
      <ReservationButton label="Actualizar reserva" disabled={busy} onPress={refresh} />
      {reservation.commercial_protocol && observed && <Text style={styles.text}>{readinessLabels[readiness?.state ?? 'unknown']}</Text>}
      {api.localDemoCheckoutEnabled && reservation.commercial_protocol && observed?.hold?.state === 'held' && (seconds ?? 0) > 0 &&
        readiness?.state === 'web_checkout_required' &&
        <ReservationButton label="Elegir método de pago de prueba"
          disabled={busy}
          onPress={() => router.push({ pathname: '/tabs/pago', params: { id } })} />}
      {canCommit && decision !== 'cancel' && (decision === 'commit' ? <>
        <Text style={styles.text}>Confirma el horario retenido. Esta operación no realiza un cobro.</Text>
        <ReservationButton label="Confirmar contratación" disabled={busy} onPress={() => void send('commit')} />
        <ReservationButton label="Volver sin confirmar" onPress={() => setDecision(undefined)} />
      </> : <ReservationButton label="Revisar confirmación" disabled={busy} onPress={() => setDecision('commit')} />)}
      {canCancel && decision !== 'commit' && (decision === 'cancel' ? <>
        <Text style={styles.text}>¿Quieres cancelar esta reserva? El servidor comprobará su estado antes de cancelarla.</Text>
        <ReservationButton label="Confirmar cancelación" disabled={busy} onPress={() => void send('cancel')} />
        <ReservationButton label="Conservar reserva" onPress={() => setDecision(undefined)} />
      </> : <ReservationButton label="Cancelar reserva" disabled={busy} onPress={() => setDecision('cancel')} />)}
      <ReservationButton label="Ver solicitud" onPress={() => router.push({ pathname: '/tabs/solicitud', params: { id: reservation.inquiry_id } })} />
    </>}
  </View>;
}
