import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '@/api/client';
import { ApiError, errorMessage } from '@/api/http';
import { inquiryPath, isJourneyResource, type ContractingJourney } from '@/api/inquiries';
import { mxn } from '@/api/quotes';
import { cancelReservation, isContextResource, isReservationResource, observedHoldSeconds,
  reservationLabels, type Reservation, type ReservationContext } from '@/api/reservations';
import { finishReservationIntent, reservationIntent, reservationScope } from '@/api/reservation-intent';
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
  return context && clock?.context === context ? clock.seconds : undefined;
}

export function ReservationDetail({ id }: { id: number }) {
  const router = useRouter();
  const { user } = useSession();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const focused = useRef(false);
  const sending = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; };
  }, []));
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
  const current = journey.data?.data.reservation;
  const canCancel = !!reservation && current?.id === id && current.version === reservation.version && current.actions.includes('cancel');
  const observed = context.data?.data.reservation.version === reservation?.version ? context.data?.data : undefined;
  const seconds = useRemainingHold(observed);

  function refresh() {
    setConfirmCancel(false);
    detail.retry();
    context.retry();
    journey.retry();
  }

  async function cancel() {
    if (!user || !reservation || !canCancel || !confirmCancel || sending.current || !focused.current) return;
    const scope = reservationScope(user.id, 'cancel', id);
    sending.current = true;
    setBusy(true);
    setConfirmCancel(false);
    try {
      const key = reservation.commercial_protocol ? await reservationIntent(scope, { version: reservation.version }) : undefined;
      if (!focused.current) return;
      await cancelReservation(api, reservation, key);
      await finishReservationIntent(scope);
      if (focused.current) setNotice('Reserva cancelada.');
    } catch (error) {
      if (error instanceof ApiError && [409, 422].includes(error.status)) await finishReservationIntent(scope);
      if (focused.current) setNotice(errorMessage(error));
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
      {canCancel && (confirmCancel ? <>
        <Text style={styles.text}>¿Quieres cancelar esta reserva? El servidor comprobará su estado antes de cancelarla.</Text>
        <ReservationButton label="Confirmar cancelación" disabled={busy} onPress={() => void cancel()} />
        <ReservationButton label="Conservar reserva" onPress={() => setConfirmCancel(false)} />
      </> : <ReservationButton label="Cancelar reserva" disabled={busy} onPress={() => setConfirmCancel(true)} />)}
      <ReservationButton label="Ver solicitud" onPress={() => router.push({ pathname: '/tabs/solicitud', params: { id: reservation.inquiry_id } })} />
    </>}
  </View>;
}
