
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import { api } from '@/api/client';
import {
  commandIntent,
  finishCommandIntent,
} from '@/api/command-intent';
import {
  choiceLabel,
  demoCheckoutPath,
  isDemoCheckoutResource,
  submitDemoCheckout,
  type DemoCheckout,
  type DemoChoice,
} from '@/api/demo-checkout';
import { ApiError, errorMessage } from '@/api/http';
import { mxn } from '@/api/quotes';
import {
  isContextResource,
  observedHoldSeconds,
} from '@/api/reservations';
import { resourceId } from '@/api/types';
import { useSession } from '@/auth/context';
import { ApiState } from '@/components/api-state';
import { useApiResource } from '@/hooks/use-api-resource';
import { useTekoraTheme } from '@/theme/tekora-theme';

const BLUE = '#005B9F';
const NAVY = '#002F5C';

// Etiquetas visuales más naturales.
// El estado real del backend permanece intacto.
function presentCheckoutLabel(
  status: DemoCheckout['status']
) {
  if (status === 'test_approved') {
    return 'Tarjeta autorizada';
  }

  if (status === 'awaiting_cash') {
    return 'Método en efectivo registrado';
  }

  if (status === 'cash_received') {
    return 'Efectivo recibido';
  }

  if (status === 'not_selected') {
    return 'Selecciona tu método';
  }

  return choiceLabel(status);
}

function Countdown({
  seconds,
}: {
  seconds: number;
}) {
  const styles = usePaymentStyles();
  const { colors } = useTekoraTheme();

  return (
    <View style={styles.timer}>
      <Ionicons
        name="time-outline"
        size={18}
        color={colors.primary}
      />
      <Text style={styles.timerText}>
        {Math.floor(seconds / 60)}:
        {String(seconds % 60).padStart(2, '0')}
        {' '}para confirmar
      </Text>
    </View>
  );
}

function Option({
  title,
  description,
  icon,
  selected,
  onPress,
  disabled,
}: {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  const styles = usePaymentStyles();
  const { colors } = useTekoraTheme();

  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{
        checked: selected,
        disabled,
      }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.option,
        selected && styles.selected,
      ]}
    >
      <View style={styles.optionIcon}>
        <Ionicons
          name={icon}
          size={25}
          color={colors.primary}
        />
      </View>

      <View style={styles.grow}>
        <Text style={styles.optionTitle}>
          {title}
        </Text>
        <Text style={styles.muted}>
          {description}
        </Text>
      </View>

      <Ionicons
        name={
          selected
            ? 'radio-button-on'
            : 'radio-button-off'
        }
        size={23}
        color={
          selected
            ? colors.primary
            : colors.muted
        }
      />
    </TouchableOpacity>
  );
}

export default function PagoScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    id?: string;
  }>();

  const id = resourceId(params.id);
  const { user } = useSession();

  const { colors, darkMode } = useTekoraTheme();
  const styles = usePaymentStyles();

  const [method, setMethod] =
    useState<'card' | 'cash' | null>(null);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

  const [result, setResult] =
    useState<DemoCheckout | null>(null);

  const [seconds, setSeconds] = useState(0);
  const sending = useRef(false);

  // Campos de demostración.
  // No se envían al backend.
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const check = useCallback(
    (
      value: unknown
    ): value is { data: DemoCheckout } =>
      isDemoCheckoutResource(value) &&
      value.data.reservation_id === id,
    [id]
  );

  const checkout = useApiResource(
    id ? demoCheckoutPath(id) : null,
    check,
    true
  );

  const contextCheck = useCallback(
    (
      value: unknown
    ): value is {
      data: import('@/api/reservations').ReservationContext;
    } =>
      isContextResource(value) &&
      value.data.reservation.id === id &&
      value.data.client.id === user?.id,
    [id, user?.id]
  );

  const context = useApiResource(
    id
      ? `/reservations/${id}/checkout-context`
      : null,
    contextCheck,
    true
  );

  const current = checkout.data?.data ?? result;
  const snapshot = context.data?.data;

  // Se conserva el control de retención.
  const deadline = useRef<{
    expires: string;
    at: number;
  } | null>(null);

  useEffect(() => {
    if (snapshot?.hold?.state !== 'held') {
      return;
    }

    const candidate =
      performance.now() +
      observedHoldSeconds(snapshot) * 1000;

    const expires = snapshot.hold.expires_at;

    const at =
      deadline.current?.expires === expires
        ? Math.min(
            deadline.current.at,
            candidate
          )
        : candidate;

    deadline.current = { expires, at };

    const tick = () => {
      setSeconds(
        Math.max(
          0,
          Math.ceil(
            (at - performance.now()) / 1000
          )
        )
      );
    };

    tick();

    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  }, [snapshot]);

  function backToReservation() {
    if (id) {
      router.replace({
        pathname: '/tabs/reserva',
        params: { id },
      });
    } else {
      router.back();
    }
  }

  // Operación original contra el simulador.
  // El escenario solicitado es siempre aprobado.
  async function submit() {
    if (
      !user ||
      !id ||
      !method ||
      sending.current ||
      !current?.can_choose ||
      !snapshot ||
      seconds <= 0 ||
      snapshot.reservation.status !== 'held'
    ) {
      return;
    }

    const choice: DemoChoice =
      method === 'cash'
        ? { method: 'cash' }
        : {
            method: 'card',
            scenario: 'approved',
          };

    const scope =
      'tekora.mobile.demo-checkout.' +
      user.id +
      '.' +
      id;

    sending.current = true;
    setBusy(true);
    setNotice(undefined);

    try {
      const key = await commandIntent(
        scope,
        choice
      );

      const response = await submitDemoCheckout(
        api,
        id,
        choice,
        key
      );

      await finishCommandIntent(scope);

      setResult(response);

      setNotice(
        presentCheckoutLabel(response.status)
      );

      // Limpiar los campos visuales.
      setCardName('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');

      checkout.retry();
      context.retry();
    } catch (error) {
      if (
        error instanceof ApiError &&
        [409, 422].includes(error.status)
      ) {
        await finishCommandIntent(scope);
      }

      const uncertain =
        !(error instanceof ApiError) ||
        error.status >= 500 ||
        [
          'network',
          'invalid_response',
        ].includes(error.code);

      setNotice(
        uncertain
          ? 'No se pudo verificar el resultado. Actualiza el estado antes de volver a intentarlo.'
          : errorMessage(error)
      );

      checkout.retry();
      context.retry();
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const demoUnavailable =
    checkout.error instanceof ApiError &&
    checkout.error.status === 404;

  const amount =
    snapshot?.amount ??
    current?.amount;

  const canChoose =
    !!current?.can_choose &&
    !!amount &&
    !!snapshot?.hold &&
    snapshot.hold.state === 'held' &&
    seconds > 0 &&
    !busy;

  const chosen = method !== null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Encabezado */}
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver a la reserva"
          onPress={backToReservation}
          style={styles.back}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text style={styles.topTitle}>
          Tu contratación
        </Text>

        <View style={styles.back} />
      </View>

      <ScrollView
        style={{
          backgroundColor: colors.background,
        }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Presentación */}
        <View style={styles.hero}>
          <View style={styles.heroPill}>
            <Ionicons
              name="shield-checkmark-outline"
              color="#B3E5FC"
              size={15}
            />

            <Text style={styles.heroPillText}>
              TEKORA · CONTRATACIÓN
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            Elige cómo pagar
          </Text>

          <Text style={styles.heroSubtitle}>
            Selecciona un método para continuar
            con la confirmación de tu horario.
          </Text>

          <View style={styles.progress}>
            <View style={styles.stepDone} />
            <View style={styles.stepDone} />
            <View style={styles.stepCurrent} />
            <View style={styles.stepPending} />
          </View>

          <Text style={styles.progressLabel}>
            Solicitud · Horario · Método · Confirmación
          </Text>
        </View>

        {/* Disponibilidad */}
        {!id && (
          <Text style={styles.error}>
            Abre esta pantalla desde una
            reserva válida.
          </Text>
        )}

        {demoUnavailable && (
          <View style={styles.noteCard}>
            <Ionicons
              name="lock-closed-outline"
              size={23}
              color={colors.primary}
            />

            <View style={styles.grow}>
              <Text style={styles.sectionTitle}>
                Método de pago no disponible
              </Text>

              <Text style={styles.muted}>
                Este entorno no tiene habilitado
                el procesamiento de pagos.
              </Text>
            </View>
          </View>
        )}

        {!demoUnavailable && (
          <ApiState {...checkout} />
        )}

        {id && (
          <ApiState {...context} />
        )}

        {/* Resumen económico */}
        {amount && (
          <View style={styles.summary}>
            <View style={styles.sectionHeader}>
              <View style={styles.summaryIcon}>
                <Ionicons
                  name="receipt-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>

              <View style={styles.grow}>
                <Text style={styles.summaryLabel}>
                  Resumen de contratación
                </Text>

                <Text
                  style={styles.service}
                  numberOfLines={2}
                >
                  {snapshot?.service.title ??
                    'Servicio Tekora'}
                </Text>

                <Text style={styles.muted}>
                  Reserva #{id}
                </Text>
              </View>
            </View>

            <View style={styles.separator} />

            <Text style={styles.priceCaption}>
              Total acordado
            </Text>

            <Text style={styles.total}>
              {mxn(amount.total_cents)}
            </Text>

            <View style={styles.moneyRow}>
              <Text style={styles.muted}>
                Para el prestador
              </Text>

              <Text style={styles.moneyValue}>
                {mxn(amount.provider_cents)}
              </Text>
            </View>

            <View style={styles.moneyRow}>
              <Text style={styles.muted}>
                Comisión Tekora (15 % incluida)
              </Text>

              <Text style={styles.moneyValue}>
                {mxn(amount.commission_cents)}
              </Text>
            </View>

            {snapshot?.hold?.state === 'held' && (
              <Countdown seconds={seconds} />
            )}
          </View>
        )}

        {/* Resultado de la selección */}
        {current &&
          current.status !== 'not_selected' && (
            <View
              style={[
                styles.statusBox,
                current.can_confirm &&
                  styles.statusSuccess,
              ]}
            >
              <Ionicons
                name={
                  current.can_confirm
                    ? 'checkmark-circle-outline'
                    : 'alert-circle-outline'
                }
                size={24}
                color={
                  current.can_confirm
                    ? darkMode
                      ? '#8BE0B1'
                      : '#136B46'
                    : darkMode
                      ? '#FFD18A'
                      : '#A86B13'
                }
              />

              <View style={styles.grow}>
                <Text style={styles.statusTitle}>
                  {presentCheckoutLabel(
                    current.status
                  )}
                </Text>

                <Text style={styles.statusCaption}>
                  Resultado de simulación
                </Text>

                {current.can_confirm && (
                  <Text style={styles.muted}>
                    Método registrado. Ahora
                    confirma tu horario desde
                    la reserva.
                  </Text>
                )}

                {!!current.reference && (
                  <Text style={styles.reference}>
                    Referencia interna:{' '}
                    {current.reference}
                  </Text>
                )}
              </View>
            </View>
          )}

        {/* Métodos disponibles */}
        {current?.can_choose && amount && (
          <View style={styles.methods}>
            <Text style={styles.sectionTitle}>
              Selecciona un método
            </Text>

            <Text style={styles.muted}>
              Elige una opción para continuar
              con tu contratación.
            </Text>

            <View
              accessibilityRole="radiogroup"
              style={styles.options}
            >
              <Option
                icon="card-outline"
                title="Tarjeta bancaria"
                description="Continuar con tarjeta"
                selected={method === 'card'}
                onPress={() => setMethod('card')}
                disabled={!canChoose}
              />

              <Option
                icon="cash-outline"
                title="Efectivo"
                description="Pago al prestador después del servicio"
                selected={method === 'cash'}
                onPress={() => setMethod('cash')}
                disabled={!canChoose}
              />
            </View>

            {/* Formulario visual */}
            {method === 'card' && (
              <View style={styles.cardPanel}>
                <View style={styles.formHeader}>
                  <Ionicons
                    name="card-outline"
                    size={23}
                    color={colors.primary}
                  />

                  <Text style={styles.sectionTitle}>
                    Datos de tarjeta
                  </Text>
                </View>

                

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Nombre del titular
                  </Text>

                  <TextInput
                    accessibilityLabel="Titular ficticio"
                    style={styles.demoInput}
                    placeholder="NOMBRE DEL TITULAR"
                    placeholderTextColor={colors.muted}
                    value={cardName}
                    onChangeText={setCardName}
                    autoCapitalize="characters"
                    autoComplete="off"
                    editable={canChoose}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Número de tarjeta
                  </Text>

                  <TextInput
                    accessibilityLabel="Número ficticio"
                    style={styles.demoInput}
                    placeholder="4242 4242 4242 4242"
                    placeholderTextColor={colors.muted}
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    keyboardType="number-pad"
                    autoComplete="off"
                    editable={canChoose}
                  />
                </View>

                <View style={styles.demoFieldsRow}>
                  <View style={styles.demoField}>
                    <Text style={styles.fieldLabel}>
                      Vencimiento
                    </Text>

                    <TextInput
                      accessibilityLabel="Vencimiento ficticio"
                      style={styles.demoInput}
                      placeholder="12/30"
                      placeholderTextColor={colors.muted}
                      value={cardExpiry}
                      onChangeText={setCardExpiry}
                      autoComplete="off"
                      editable={canChoose}
                    />
                  </View>

                  <View style={styles.demoField}>
                    <Text style={styles.fieldLabel}>
                      CVV
                    </Text>

                    <TextInput
                      accessibilityLabel="Código ficticio"
                      style={styles.demoInput}
                      placeholder="123"
                      placeholderTextColor={colors.muted}
                      value={cardCvv}
                      onChangeText={setCardCvv}
                      keyboardType="number-pad"
                      secureTextEntry
                      autoComplete="off"
                      editable={canChoose}
                    />
                  </View>
                </View>

                
              </View>
            )}

            {/* Efectivo */}
            {method === 'cash' && (
              <View style={styles.cashInfo}>
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color={colors.primary}
                />

                <Text style={styles.muted}>
                  Al elegir efectivo podrás
                  continuar con la reserva.
                  La recepción quedará pendiente
                  hasta que el prestador registre
                  el resultado correspondiente
                  en este entorno de demostración.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Avisos */}
        {notice && (
          <Text
            accessibilityLiveRegion="polite"
            style={styles.notice}
          >
            {notice}
          </Text>
        )}

        {busy && (
          <ActivityIndicator
            color={colors.primary}
            size="small"
          />
        )}

        {/* Continuar o regresar */}
        {current?.can_confirm ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.action}
            disabled={busy}
            onPress={backToReservation}
          >
            <Text style={styles.actionText}>
              Volver y confirmar reserva
            </Text>

            <Ionicons
              name="arrow-forward"
              size={21}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{
              disabled: !canChoose || !chosen,
            }}
            disabled={!canChoose || !chosen}
            style={[
              styles.action,
              (!canChoose || !chosen) &&
                styles.disabled,
            ]}
            onPress={() => {
              void submit();
            }}
          >
            <Text style={styles.actionText}>
              Continuar con el método
            </Text>

            <Ionicons
              name="arrow-forward"
              size={21}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          accessibilityRole="button"
          onPress={backToReservation}
          style={styles.cancel}
        >
          <Text style={styles.cancelText}>
            Volver sin seleccionar
          </Text>
        </TouchableOpacity>

        {/* Aviso informativo */}
        
      </ScrollView>
    </SafeAreaView>
  );
}

// Estilos dinámicos de Tekora.
function usePaymentStyles() {
  const { colors, darkMode } = useTekoraTheme();

  const surface = colors.surface;
  const text = colors.text;
  const muted = colors.muted;
  const border = colors.border;
  const primary = colors.primary;

  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },

    topBar: {
      backgroundColor: surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 12,
    },

    topTitle: {
      color: text,
      fontSize: 17,
      fontWeight: '800',
    },

    back: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },

    content: {
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
      padding: 18,
      paddingBottom: 54,
      gap: 16,
    },

    hero: {
      backgroundColor: NAVY,
      borderRadius: 22,
      padding: 24,
      gap: 12,
    },

    heroPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    heroPillText: {
      color: '#B3E5FC',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.1,
    },

    heroTitle: {
      color: '#FFFFFF',
      fontSize: 27,
      fontWeight: '800',
    },

    heroSubtitle: {
      color: '#C8E5F4',
      fontSize: 14,
      lineHeight: 20,
    },

    progress: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
    },

    stepDone: {
      height: 5,
      backgroundColor: '#72D5B4',
      flex: 1,
      borderRadius: 4,
    },

    stepCurrent: {
      height: 5,
      backgroundColor: '#FFFFFF',
      flex: 1,
      borderRadius: 4,
    },

    stepPending: {
      height: 5,
      backgroundColor: '#446B93',
      flex: 1,
      borderRadius: 4,
    },

    progressLabel: {
      color: '#D4EAF5',
      fontSize: 11,
    },

    summary: {
      backgroundColor: surface,
      borderRadius: 20,
      padding: 20,
      gap: 11,
      borderColor: border,
      borderWidth: 1,
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    summaryIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },

    grow: {
      flex: 1,
      gap: 3,
    },

    summaryLabel: {
      color: primary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },

    service: {
      color: text,
      fontSize: 16,
      fontWeight: '700',
    },

    muted: {
      color: muted,
      fontSize: 13,
      lineHeight: 19,
    },

    separator: {
      height: 1,
      backgroundColor: border,
      marginVertical: 4,
    },

    priceCaption: {
      color: muted,
      fontSize: 12,
    },

    total: {
      color: darkMode ? '#90E0EF' : NAVY,
      fontSize: 31,
      fontWeight: '800',
    },

    moneyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      flexWrap: 'wrap',
    },

    moneyValue: {
      color: text,
      fontSize: 13,
      fontWeight: '700',
    },

    timer: {
      backgroundColor: colors.accent,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 11,
      marginTop: 4,
    },

    timerText: {
      color: primary,
      fontWeight: '800',
      fontSize: 14,
    },

    statusBox: {
      flexDirection: 'row',
      padding: 14,
      borderRadius: 14,
      backgroundColor: darkMode
        ? '#44321B'
        : '#FFF4E5',
      gap: 10,
      borderWidth: 1,
      borderColor: darkMode
        ? '#806133'
        : '#F2DDBA',
    },

    statusSuccess: {
      backgroundColor: darkMode
        ? '#143B30'
        : '#E8F8EF',
      borderColor: darkMode
        ? '#276C50'
        : '#C6E9D6',
    },

    statusTitle: {
      color: text,
      fontSize: 15,
      fontWeight: '800',
    },

    statusCaption: {
      color: muted,
      fontSize: 11,
      fontWeight: '600',
    },

    reference: {
      color: muted,
      fontSize: 11,
      marginTop: 4,
    },

    methods: {
      backgroundColor: surface,
      borderRadius: 20,
      padding: 18,
      gap: 12,
      borderColor: border,
      borderWidth: 1,
    },

    sectionTitle: {
      color: text,
      fontSize: 17,
      fontWeight: '800',
    },

    options: {
      gap: 10,
    },

    option: {
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: border,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: surface,
    },

    selected: {
      borderColor: primary,
      backgroundColor: darkMode
        ? '#102B48'
        : '#F0FAFF',
    },

    optionIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },

    optionTitle: {
      color: text,
      fontWeight: '800',
      fontSize: 15,
    },

    cardPanel: {
      gap: 12,
      paddingTop: 12,
    },

    formHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    fieldGroup: {
      gap: 8,
    },

    fieldLabel: {
      color: text,
      fontSize: 13,
      fontWeight: '700',
    },

    demoInput: {
      color: text,
      backgroundColor: darkMode
        ? '#102B48'
        : '#F6F9FC',
      borderColor: border,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
    },

    demoFieldsRow: {
      flexDirection: 'row',
      gap: 12,
    },

    demoField: {
      flex: 1,
      gap: 8,
    },

    demoNotice: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
      backgroundColor: colors.accent,
      padding: 12,
      borderRadius: 12,
    },

    demoNoticeText: {
      flex: 1,
      color: muted,
      fontSize: 12,
      lineHeight: 18,
    },

    cashInfo: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      gap: 10,
    },

    action: {
      backgroundColor: BLUE,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 10,
    },

    actionText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },

    disabled: {
      opacity: 0.45,
    },

    cancel: {
      alignItems: 'center',
      padding: 8,
    },

    cancelText: {
      color: primary,
      fontWeight: '700',
    },

    legal: {
      flexDirection: 'row',
      backgroundColor: darkMode
        ? '#102B48'
        : '#E9F3FA',
      borderRadius: 14,
      padding: 14,
      gap: 9,
      alignItems: 'flex-start',
    },

    legalText: {
      flex: 1,
      color: muted,
      fontSize: 12,
      lineHeight: 18,
    },

    noteCard: {
      backgroundColor: surface,
      borderRadius: 15,
      padding: 16,
      flexDirection: 'row',
      gap: 12,
    },

    error: {
      color: colors.error,
      fontWeight: '700',
    },

    notice: {
      textAlign: 'center',
      fontSize: 13,
      color: text,
      fontWeight: '700',
      backgroundColor: colors.accent,
      borderRadius: 12,
      padding: 12,
    },
  });
}
