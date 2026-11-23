import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/api/client';
import { commandIntent, finishCommandIntent } from '@/api/command-intent';
import { choiceLabel, demoCheckoutPath, isDemoCheckoutResource, submitDemoCheckout,
  type DemoCheckout, type DemoChoice } from '@/api/demo-checkout';
import { ApiError, errorMessage } from '@/api/http';
import { mxn } from '@/api/quotes';
import { isContextResource, observedHoldSeconds } from '@/api/reservations';
import { resourceId } from '@/api/types';
import { useSession } from '@/auth/context';
import { ApiState } from '@/components/api-state';
import { useApiResource } from '@/hooks/use-api-resource';

const BLUE = '#005b9f';
const NAVY = '#002f5c';
type Scenario = 'approved' | 'declined' | 'temporary_failure';

function Countdown({ seconds }: { seconds: number }) {
  return <View style={styles.timer}>
    <Ionicons name="time-outline" size={18} color="#00749c" />
    <Text style={styles.timerText}>
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} para confirmar
    </Text>
  </View>;
}

function Option({ title, description, icon, selected, onPress, disabled }: {
  title: string; description: string; icon: React.ComponentProps<typeof Ionicons>['name'];
  selected: boolean; onPress: () => void; disabled: boolean;
}) {
  return <TouchableOpacity accessibilityRole="radio" accessibilityLabel={title} accessibilityHint={description}
    accessibilityState={{ checked: selected, disabled }}
    disabled={disabled} onPress={onPress} style={[styles.option, selected && styles.selected]}>
    <View style={styles.optionIcon}><Ionicons name={icon} size={25} color={BLUE} /></View>
    <View style={styles.grow}>
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.muted}>{description}</Text>
    </View>
    <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={23} color={selected ? BLUE : '#aab8c4'} />
  </TouchableOpacity>;
}

function ScenarioChoice({ scenario, current, title, onPress, disabled }: {
  scenario: Scenario; current: Scenario; title: string; onPress: (value: Scenario) => void; disabled: boolean;
}) {
  return <TouchableOpacity accessibilityRole="radio"
    accessibilityState={{ checked: current === scenario, disabled }}
    disabled={disabled} onPress={() => onPress(scenario)}
    style={[styles.scenario, current === scenario && styles.scenarioSelected]}>
    <Text style={[styles.scenarioText, current === scenario && styles.scenarioTextSelected]}>{title}</Text>
  </TouchableOpacity>;
}

export default function PagoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = resourceId(params.id);
  const { user } = useSession();
  const [method, setMethod] = useState<'card' | 'cash' | null>(null);
  const [scenario, setScenario] = useState<Scenario>('approved');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [result, setResult] = useState<DemoCheckout | null>(null);
  const [seconds, setSeconds] = useState(0);
  const sending = useRef(false);

  const check = useCallback((value: unknown): value is { data: DemoCheckout } =>
    isDemoCheckoutResource(value) && value.data.reservation_id === id, [id]);
  const checkout = useApiResource(id ? demoCheckoutPath(id) : null, check, true);
  const contextCheck = useCallback((value: unknown): value is { data: import('@/api/reservations').ReservationContext } =>
    isContextResource(value) && value.data.reservation.id === id &&
    value.data.client.id === user?.id, [id, user?.id]);
  const context = useApiResource(id ? '/reservations/' + id + '/checkout-context' : null, contextCheck, true);
  const current = checkout.data?.data ?? result;
  const snapshot = context.data?.data;
  const deadline = useRef<{ expires: string; at: number } | null>(null);

  useEffect(() => {
    if (snapshot?.hold?.state !== 'held') return;
    const candidate = performance.now() + observedHoldSeconds(snapshot) * 1000;
    const expires = snapshot.hold.expires_at;
    const at = deadline.current?.expires === expires ? Math.min(deadline.current.at, candidate) : candidate;
    deadline.current = { expires, at };
    const tick = () => setSeconds(Math.max(0, Math.ceil((at - performance.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [snapshot]);

  function backToReservation() {
    if (id) router.replace({ pathname: '/tabs/reserva', params: { id } });
    else router.back();
  }

  async function submit() {
    if (!user || !id || !method || sending.current || !current?.can_choose ||
      !snapshot || seconds <= 0 || snapshot.reservation.status !== 'held') return;
    const choice: DemoChoice = method === 'cash' ? { method: 'cash' } : { method: 'card', scenario };
    const scope = 'tekora.mobile.demo-checkout.' + user.id + '.' + id;
    sending.current = true;
    setBusy(true);
    setNotice(undefined);
    try {
      const key = await commandIntent(scope, choice);
      const response = await submitDemoCheckout(api, id, choice, key);
      await finishCommandIntent(scope);
      setResult(response);
      setNotice(choiceLabel(response.status));
      checkout.retry();
      context.retry();
    } catch (error) {
      if (error instanceof ApiError && [409, 422].includes(error.status)) {
        await finishCommandIntent(scope);
      }
      const uncertain = !(error instanceof ApiError) || error.status >= 500 ||
        ['network', 'invalid_response'].includes(error.code);
      setNotice(uncertain ?
        'No se pudo verificar el intento. Actualiza el estado antes de repetir; se conservará la misma intención.' :
        errorMessage(error));
      checkout.retry();
      context.retry();
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const demoUnavailable = checkout.error instanceof ApiError && checkout.error.status === 404;
  const amount = snapshot?.amount ?? current?.amount;
  const canChoose = !!current?.can_choose && !!amount && !!snapshot?.hold &&
    snapshot.hold.state === 'held' && seconds > 0 && !busy;
  const chosen = method !== null;

  return <SafeAreaView style={styles.safe}>
    <View style={styles.topBar}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a la reserva"
        onPress={backToReservation} style={styles.back}>
        <Ionicons name="arrow-back" size={23} color={NAVY} />
      </TouchableOpacity>
      <Text style={styles.topTitle}>Tu contratación</Text>
      <View style={styles.back} />
    </View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <View style={styles.heroPill}>
          <Ionicons name="shield-checkmark-outline" color="#b3e5fc" size={15} />
          <Text style={styles.heroPillText}>TEKORA · DEMOSTRACIÓN LOCAL</Text>
        </View>
        <Text style={styles.heroTitle}>Elige cómo pagar</Text>
        <Text style={styles.heroSubtitle}>Un último paso antes de confirmar tu horario.</Text>
        <View style={styles.progress}>
          <View style={styles.stepDone} /><View style={styles.stepDone} />
          <View style={styles.stepCurrent} /><View style={styles.stepPending} />
        </View>
        <Text style={styles.progressLabel}>Solicitud  ·  Horario  ·  Método  ·  Confirmación</Text>
      </View>

      {!id && <Text style={styles.error}>Abre esta pantalla desde una reserva válida.</Text>}
      {demoUnavailable && <View style={styles.noteCard}>
        <Ionicons name="lock-closed-outline" color={BLUE} size={23} />
        <View style={styles.grow}>
          <Text style={styles.sectionTitle}>Checkout de prueba no disponible</Text>
          <Text style={styles.muted}>Este flujo solo está habilitado en la base sintética B3.2 local.
            Tu servidor habitual no acepta selecciones de pago ficticias.</Text>
        </View>
      </View>}
      {!demoUnavailable && <ApiState {...checkout} />}
      {id && <ApiState {...context} />}
      {amount && <View style={styles.summary}>
        <View style={styles.sectionHeader}>
          <View style={styles.summaryIcon}><Ionicons name="receipt-outline" size={22} color={BLUE} /></View>
          <View style={styles.grow}>
            <Text style={styles.summaryLabel}>Resumen de contratación</Text>
            <Text style={styles.service} numberOfLines={2}>{snapshot?.service.title ?? 'Servicio Tekora'}</Text>
            <Text style={styles.muted}>Reserva #{id}</Text>
          </View>
        </View>
        <View style={styles.separator} />
        <Text style={styles.priceCaption}>Total acordado</Text>
        <Text style={styles.total}>{mxn(amount.total_cents)}</Text>
        <View style={styles.moneyRow}><Text style={styles.muted}>Para el prestador</Text><Text style={styles.moneyValue}>{mxn(amount.provider_cents)}</Text></View>
        <View style={styles.moneyRow}><Text style={styles.muted}>Comisión Tekora (15 % incluida)</Text><Text style={styles.moneyValue}>{mxn(amount.commission_cents)}</Text></View>
        {snapshot?.hold?.state === 'held' && <Countdown seconds={seconds} />}
      </View>}

      {current && current.status !== 'not_selected' && <View style={[styles.statusBox, current.can_confirm && styles.statusSuccess]}>
        <Ionicons name={current.can_confirm ? 'checkmark-circle-outline' : 'alert-circle-outline'}
          size={24} color={current.can_confirm ? '#136b46' : '#a86b13'} />
        <View style={styles.grow}>
          <Text style={styles.statusTitle}>{choiceLabel(current.status)}</Text>
          {current.can_confirm && <Text style={styles.muted}>Método registrado. Ahora confirma tu horario desde la reserva.</Text>}
          {!!current.reference && <Text style={styles.reference}>Referencia de prueba: {current.reference}</Text>}
        </View>
      </View>}

      {current?.can_choose && amount && <View style={styles.methods}>
        <Text style={styles.sectionTitle}>Selecciona un método</Text>
        <Text style={styles.muted}>Elige una opción para esta contratación de prueba.</Text>
        <View accessibilityRole="radiogroup" style={styles.options}>
          <Option icon="card-outline" title="Tarjeta" description="Simulación con tarjeta de prueba"
            selected={method === 'card'} onPress={() => setMethod('card')} disabled={!canChoose} />
          <Option icon="cash-outline" title="Efectivo" description="Pagar al prestador después del servicio"
            selected={method === 'cash'} onPress={() => setMethod('cash')} disabled={!canChoose} />
        </View>
        {method === 'card' && <View style={styles.cardPanel}>
          <View style={styles.cardVisual}>
            <View style={styles.cardTop}><Text style={styles.cardBrand}>TEKORA</Text><Ionicons name="wifi-outline" size={26} color="#cce8f5" /></View>
            <Text style={styles.cardDigits}>••••  ••••  ••••  {scenario === 'approved' ? '4242' : scenario === 'declined' ? '0002' : '0119'}</Text>
            <Text style={styles.cardLabel}>TARJETA DE PRUEBA   ·   12/30</Text>
          </View>
          <Text style={styles.sectionTitle}>Resultado de demostración</Text>
          <View accessibilityRole="radiogroup" style={styles.scenarios}>
            <ScenarioChoice current={scenario} scenario="approved" title="Aprobada" onPress={setScenario} disabled={!canChoose} />
            <ScenarioChoice current={scenario} scenario="declined" title="Rechazada" onPress={setScenario} disabled={!canChoose} />
            <ScenarioChoice current={scenario} scenario="temporary_failure" title="Fallo temporal" onPress={setScenario} disabled={!canChoose} />
          </View>
        </View>}
        {method === 'cash' && <View style={styles.cashInfo}>
          <Ionicons name="information-circle-outline" size={22} color={BLUE} />
          <Text style={styles.muted}>La elección de efectivo permitirá confirmar el horario,
            pero quedará pendiente de recepción. Solo el prestador podrá registrar después su recepción de prueba.</Text>
        </View>}
      </View>}

      {notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
      {busy && <ActivityIndicator color={BLUE} size="small" />}
      {current?.can_confirm ? <TouchableOpacity accessibilityRole="button" style={styles.action}
        disabled={busy} onPress={backToReservation}>
        <Text style={styles.actionText}>Volver y confirmar reserva</Text><Ionicons name="arrow-forward" color="#fff" size={21} />
      </TouchableOpacity> : <TouchableOpacity accessibilityRole="button"
        accessibilityState={{ disabled: !canChoose || !chosen }}
        disabled={!canChoose || !chosen} style={[styles.action, (!canChoose || !chosen) && styles.disabled]}
        onPress={() => { void submit(); }}>
        <Text style={styles.actionText}>Guardar método de prueba</Text><Ionicons name="arrow-forward" color="#fff" size={21} />
      </TouchableOpacity>}
      <TouchableOpacity style={styles.cancel} onPress={backToReservation}>
        <Text style={styles.cancelText}>Volver sin seleccionar</Text>
      </TouchableOpacity>
      <View style={styles.legal}>
        <Ionicons name="shield-checkmark-outline" size={18} color={BLUE} />
        <Text style={styles.legalText}>Entorno ficticio: no hay conexión bancaria, cobros reales ni datos de tarjetas personales.
          Guardar el método no confirma por sí solo la reserva.</Text>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f9fc' },
  topBar: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12 },
  topTitle: { color: NAVY, fontSize: 17, fontWeight: '800' },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 18, paddingBottom: 54, gap: 16 },
  hero: { backgroundColor: NAVY, borderRadius: 22, padding: 24, gap: 12 },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroPillText: { color: '#b3e5fc', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  heroTitle: { color: '#fff', fontSize: 27, fontWeight: '800' },
  heroSubtitle: { color: '#c8e5f4', fontSize: 14, lineHeight: 20 },
  progress: { flexDirection: 'row', gap: 6, marginTop: 4 },
  stepDone: { height: 5, backgroundColor: '#72d5b4', flex: 1, borderRadius: 4 },
  stepCurrent: { height: 5, backgroundColor: '#fff', flex: 1, borderRadius: 4 },
  stepPending: { height: 5, backgroundColor: '#446b93', flex: 1, borderRadius: 4 },
  progressLabel: { color: '#d4eaf5', fontSize: 11 },
  summary: { backgroundColor: '#fff', borderRadius: 20, padding: 20, gap: 11, borderColor: '#e3edf3', borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#e1f5fe', alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1, gap: 3 },
  summaryLabel: { color: BLUE, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  service: { color: NAVY, fontSize: 16, fontWeight: '700' },
  muted: { color: '#667784', fontSize: 13, lineHeight: 19 },
  separator: { height: 1, backgroundColor: '#e7eef4', marginVertical: 4 },
  priceCaption: { color: '#667784', fontSize: 12 },
  total: { color: NAVY, fontSize: 31, fontWeight: '800' },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  moneyValue: { color: NAVY, fontSize: 13, fontWeight: '700' },
  timer: { backgroundColor: '#e1f5fe', borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, marginTop: 4 },
  timerText: { color: BLUE, fontWeight: '800', fontSize: 14 },
  statusBox: { flexDirection: 'row', padding: 14, borderRadius: 14, backgroundColor: '#fff4e5', gap: 10, borderWidth: 1, borderColor: '#f2ddba' },
  statusSuccess: { backgroundColor: '#e8f8ef', borderColor: '#c6e9d6' },
  statusTitle: { color: NAVY, fontSize: 15, fontWeight: '800' },
  reference: { color: '#667784', fontSize: 11, marginTop: 4 },
  methods: { backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 12, borderColor: '#e3edf3', borderWidth: 1 },
  sectionTitle: { color: NAVY, fontSize: 17, fontWeight: '800' },
  options: { gap: 10 },
  option: { borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e9ef', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  selected: { borderColor: BLUE, backgroundColor: '#f0faff' },
  optionIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#e1f5fe', alignItems: 'center', justifyContent: 'center' },
  optionTitle: { color: NAVY, fontWeight: '800', fontSize: 15 },
  cardPanel: { gap: 12, paddingTop: 8 },
  cardVisual: { backgroundColor: '#003a66', borderRadius: 18, minHeight: 170, padding: 20, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBrand: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  cardDigits: { color: '#fff', fontSize: 22, letterSpacing: 2, fontWeight: '700' },
  cardLabel: { color: '#bee2f2', fontSize: 11, fontWeight: '700' },
  scenarios: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scenario: { backgroundColor: '#f4f7fa', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 10, borderWidth: 1, borderColor: '#dbe5ed' },
  scenarioSelected: { backgroundColor: '#e1f5fe', borderColor: BLUE },
  scenarioText: { color: '#667784', fontWeight: '700', fontSize: 12 },
  scenarioTextSelected: { color: BLUE },
  cashInfo: { backgroundColor: '#f0faff', borderRadius: 12, padding: 12, flexDirection: 'row', gap: 10 },
  action: { backgroundColor: BLUE, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  cancel: { alignItems: 'center', padding: 8 },
  cancelText: { color: BLUE, fontWeight: '700' },
  legal: { flexDirection: 'row', backgroundColor: '#e9f3fa', borderRadius: 14, padding: 14, gap: 9, alignItems: 'flex-start' },
  legalText: { flex: 1, color: '#586f7d', fontSize: 12, lineHeight: 18 },
  noteCard: { backgroundColor: '#fff', borderRadius: 15, padding: 16, flexDirection: 'row', gap: 12 },
  error: { color: '#a32622', fontWeight: '700' },
  notice: { textAlign: 'center', fontSize: 13, color: NAVY, fontWeight: '700', backgroundColor: '#e9f3fa', borderRadius: 12, padding: 12 },
});
