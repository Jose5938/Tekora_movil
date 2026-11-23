import { useCallback, useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '@/api/client';
import { ApiError, errorMessage } from '@/api/http';
import { mxn } from '@/api/quotes';
import { civilDate, civilTime, isOptionsResource, proposeReservation, type ReservationOptions } from '@/api/reservations';
import { finishCommandIntent, commandIntent, reservationScope } from '@/api/command-intent';
import type { Resource } from '@/api/types';
import { ApiState } from '@/components/api-state';
import { ReservationButton, Schedule, reservationStyles as styles } from '@/components/reservation-ui';
import { useSession } from '@/auth/context';
import { useApiResource } from '@/hooks/use-api-resource';

export function ReservationProposal({ inquiryId }: { inquiryId: number }) {
  const { user } = useSession();
  const router = useRouter();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [quoteId, setQuoteId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [uncertain, setUncertain] = useState(false);
  const sending = useRef(false);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; };
  }, []));

  const validate = useCallback((value: unknown): value is Resource<ReservationOptions> =>
    isOptionsResource(value) && value.data.inquiry_id === inquiryId, [inquiryId]);
  const query = useApiResource(`/inquiries/${inquiryId}/reservation-options`, validate, true);
  const options = query.data?.data;

  async function submit() {
    if (!user || !options || sending.current || !focused.current) return;
    const { availability_revision, commercial, min_date, max_date, blocked_dates } = options;
    if (!civilDate(date) || date < min_date || date > max_date || !civilTime(time) || blocked_dates.includes(date)) {
      setNotice('Revisa la fecha y la hora local dentro del rango indicado.'); return;
    }
    if (commercial && !commercial.accepted_quotes.some(quote => quote.id === quoteId)) {
      setNotice('Selecciona una cotización aceptada.'); return;
    }
    const proposal = { date, time, availability_revision, ...(commercial && quoteId ? { quote_id: quoteId } : {}) };
    const scope = reservationScope(user.id, 'proposal', inquiryId);
    sending.current = true;
    setBusy(true);
    setNotice(undefined);
    try {
      const key = await commandIntent(scope, proposal);
      if (!focused.current) return;
      const result = await proposeReservation(api, inquiryId, proposal, key);
      await finishCommandIntent(scope);
      if (focused.current) router.replace({ pathname: '/tabs/reserva', params: { id: result.id } });
    } catch (error) {
      if (!focused.current) return;
      if (error instanceof ApiError && [409, 422].includes(error.status)) {
        await finishCommandIntent(scope);
        setUncertain(false);
        query.retry();
      } else if (!(error instanceof ApiError) || error.status >= 500 || ['network', 'invalid_response', 'intent_pending'].includes(error.code)) {
        setUncertain(true);
      }
      setNotice(errorMessage(error));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return <View style={styles.card}>
    <Text style={styles.title}>Proponer horario</Text>
    <ApiState {...query} />
    {options && <>
      <Schedule availability={options} />
      <Text style={styles.text}>Fechas disponibles para proponer: {options.min_date} a {options.max_date}. Duración: {options.duration_minutes} minutos.</Text>
      {options.commercial && <View style={styles.group}>
        <Text style={styles.title}>Cotización aceptada</Text>
        {!options.commercial.accepted_quotes.length && <Text style={styles.text}>Acepta una cotización para continuar.</Text>}
        {options.commercial.accepted_quotes.map(quote => <TouchableOpacity key={quote.id} accessibilityRole="radio"
          accessibilityState={{ checked: quoteId === quote.id }} disabled={busy || uncertain}
          onPress={() => setQuoteId(quote.id)} style={styles.input}>
          <Text style={quoteId === quote.id ? styles.badge : styles.text}>{mxn(quote.total_cents)}</Text>
        </TouchableOpacity>)}
      </View>}
      <TextInput accessibilityLabel="Fecha de la propuesta" value={date} onChangeText={setDate}
        placeholder="AAAA-MM-DD" autoCapitalize="none" maxLength={10} editable={!busy && !uncertain} style={styles.input} />
      <TextInput accessibilityLabel="Hora de la propuesta" value={time} onChangeText={setTime}
        placeholder="HH:mm" autoCapitalize="none" maxLength={5} editable={!busy && !uncertain} style={styles.input} />
      <ReservationButton label={uncertain ? 'Reintentar la misma propuesta' : 'Enviar propuesta'} disabled={busy} onPress={() => void submit()} />
    </>}
    {notice && <Text style={styles.error} accessibilityLiveRegion="polite">{notice}</Text>}
    {uncertain && <ReservationButton label="Consultar mis reservas" onPress={() => router.push('/tabs/reserva')} />}
  </View>;
}
