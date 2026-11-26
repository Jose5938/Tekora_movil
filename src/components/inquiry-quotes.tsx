
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { api } from '@/api/client';
import { ApiError, errorMessage } from '@/api/http';
import {
  demoCheckoutPath,
  isDemoCheckoutResource,
  quotePaymentView,
  type DemoCheckout,
} from '@/api/demo-checkout';
import type { ContractingJourney } from '@/api/inquiries';
import { finishQuoteIntent, quoteIntent } from '@/api/quote-intent';
import {
  acceptQuote,
  isQuoteCollection,
  isQuoteResource,
  issueQuote,
  mxn,
  quotePath,
  quotesPath,
  type Amount,
  type CommercialQuote,
} from '@/api/quotes';
import type { Collection, Resource } from '@/api/types';
import { useSession } from '@/auth/context';
import { ApiState, Pagination } from '@/components/api-state';
import { PaymentReceipt } from '@/components/payment-receipt';
import { useApiResource } from '@/hooks/use-api-resource';
import { useTekoraTheme } from '@/theme/tekora-theme';

const labels = {
  pending: 'Pendiente de aceptación',
  accepted: 'Aceptada',
  expired: 'Vencida',
};

const quoteDate = (value: string) =>
  new Date(value).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export function InquiryQuotes({
  inquiryId,
  journey,
  refreshJourney,
}: {
  inquiryId: number;
  journey: ContractingJourney | null;
  refreshJourney: () => void;
}) {
  // Estilos conectados al tema global.
  const styles = useQuoteStyles();

  const { user } = useSession();
  const account = user?.id;

  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [failedIssue, setFailedIssue] = useState(false);
  const [acceptanceUncertain, setAcceptanceUncertain] =
    useState(false);

  const focused = useRef(false);
  const writing = useRef(false);

  // Validación original de cotizaciones.
  const validateList = useCallback(
    (value: unknown): value is Collection<CommercialQuote> =>
      isQuoteCollection(value) &&
      value.data.every(
        quote =>
          quote.inquiry_id === inquiryId &&
          quote.client_id === account
      ),
    [inquiryId, account]
  );

  const validateDetail = useCallback(
    (value: unknown): value is Resource<CommercialQuote> =>
      isQuoteResource(value) &&
      value.data.id === selected &&
      value.data.inquiry_id === inquiryId &&
      value.data.client_id === account,
    [selected, inquiryId, account]
  );

  const history = useApiResource(
    `${quotesPath(inquiryId)}?page=${page}`,
    validateList,
    true
  );

  const detail = useApiResource(
    selected ? quotePath(selected) : null,
    validateDetail,
    true
  );

  const reservationId =
    journey?.commercial.mode === 'quoted'
      ? journey.reservation?.id
      : undefined;

  const validatePayment = useCallback(
    (value: unknown): value is Resource<DemoCheckout> =>
      isDemoCheckoutResource(value) &&
      value.data.reservation_id === reservationId,
    [reservationId]
  );

  const payment = useApiResource(
    reservationId ? demoCheckoutPath(reservationId) : null,
    validatePayment,
    true
  );

  // Actualización original al regresar de una reserva.
  const latestPaymentRetry = useRef(payment.retry);

  useEffect(() => {
    latestPaymentRetry.current = payment.retry;
  }, [payment.retry]);

  const visited = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;

      if (visited.current) {
        latestPaymentRetry.current();
      }

      visited.current = true;

      return () => {
        focused.current = false;
      };
    }, [])
  );

  const currentPayment = payment.data?.data ?? null;
  const quote = detail.data?.data;
  const action = journey?.next_action;
  const commercial = journey?.commercial;

  const available =
    action?.mobile_execution_available &&
    action.interaction === 'navigate';

  const canIssue =
    available &&
    action.code === 'issue_quote' &&
    commercial?.can_issue;

  const canAccept =
    available &&
    action.code === 'review_quote' &&
    action.reference.type === 'quote' &&
    action.reference.id === quote?.id &&
    quote?.acceptance.state === 'pending' &&
    !quote.acceptance_window_expired;

  // Función original para actualizar.
  function refreshQuotes() {
    setConfirming(false);
    history.retry();

    if (selected) {
      detail.retry();
    }

    if (reservationId) {
      payment.retry();
    }

    refreshJourney();
  }

  // Selección original de cotización.
  function select(id: string) {
    setConfirming(false);
    setAcceptanceUncertain(false);
    setSelected(id);
  }

  // Lógica original de emisión y aceptación.
  // No cambia el funcionamiento de los pagos.
  async function send(kind: 'issue' | 'accept') {
    if (
      !account ||
      writing.current ||
      !focused.current ||
      (kind === 'issue'
        ? !canIssue
        : !canAccept || !confirming || !quote)
    ) {
      return;
    }

    writing.current = true;
    setBusy(true);
    setNotice(undefined);
    setConfirming(false);

    try {
      const key =
        kind === 'issue'
          ? await quoteIntent(account, inquiryId)
          : null;

      if (!focused.current) return;

      const result = key
        ? await issueQuote(api, inquiryId, key)
        : await acceptQuote(api, quote!.id);

      const ownResponse =
        result.client_id === account &&
        result.inquiry_id === inquiryId;

      if (!ownResponse) {
        throw new ApiError(
          200,
          'invalid_response',
          'No se pudo verificar la cotización propia.'
        );
      }

      let cleaned = true;

      if (kind === 'issue') {
        try {
          await finishQuoteIntent(account, inquiryId);
        } catch {
          cleaned = false;
        }
      }

      if (!focused.current) return;

      setFailedIssue(false);
      select(result.id);
      setPage(1);
      refreshQuotes();

      setNotice(
        kind === 'accept'
          ? 'Cotización aceptada.'
          : cleaned
            ? 'Cotización disponible.'
            : 'Cotización disponible. El próximo intento conservará la clave de esta emisión.'
      );
    } catch (error) {
      if (!focused.current) return;

      const uncertain =
        !(error instanceof ApiError) ||
        error.status >= 500 ||
        error.code === 'network' ||
        error.code === 'invalid_response' ||
        error.code === 'unsafe_redirect';

      if (kind === 'issue' && uncertain) {
        setFailedIssue(true);
      }

      if (kind === 'accept' && uncertain) {
        setAcceptanceUncertain(true);
      }

      setNotice(
        uncertain
          ? 'No se pudo comprobar el resultado. Actualiza las cotizaciones antes de repetir la acción.'
          : errorMessage(error)
      );

      if (
        uncertain ||
        (error instanceof ApiError && error.status === 409)
      ) {
        refreshQuotes();
      }
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      {/* Encabezado de cotizaciones */}
      <View style={styles.row}>
        <Text style={styles.title}>
          Cotizaciones
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          disabled={busy}
          onPress={refreshQuotes}
          style={styles.action}
        >
          <Text style={styles.link}>
            Actualizar cotizaciones
          </Text>
        </TouchableOpacity>
      </View>

      {/* Importe acordado */}
      {commercial?.agreed_amount && (
        <View style={styles.agreed}>
          <Text style={styles.title}>
            Importe acordado
          </Text>

          <AmountDetails
            amount={commercial.agreed_amount}
          />

          {commercial.quote && (
            <>
              <PaymentBadge
                quoteId={commercial.quote.id}
                checkout={currentPayment}
              />

              <PaymentReceipt
                quoteId={commercial.quote.id}
                checkout={currentPayment}
              />
            </>
          )}
        </View>
      )}

      {/* Avisos de operaciones */}
      {notice && (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.body}
        >
          {notice}
        </Text>
      )}

      {/* Solicitar cotización */}
      {canIssue && (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void send('issue')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {failedIssue
              ? 'Reintentar la misma emisión'
              : 'Solicitar cotización'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Ver cotización vigente */}
      {commercial?.quote && (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={busy}
          onPress={() =>
            select(commercial.quote!.id)
          }
          style={styles.action}
        >
          <Text style={styles.link}>
            {commercial.quote.state === 'accepted'
              ? 'Ver cotización aceptada'
              : 'Ver cotización vigente'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Historial de cotizaciones */}
      <ApiState
        {...history}
        empty={history.data?.data.length === 0}
        emptyMessage="No tienes cotizaciones para esta solicitud."
      />

      {history.data?.data.map(item => (
        <TouchableOpacity
          key={item.id}
          accessibilityRole="button"
          disabled={busy}
          onPress={() => select(item.id)}
          style={styles.listItem}
        >
          <Text style={styles.title}>
            {mxn(item.amount.total_cents)}
          </Text>

          <Text style={styles.body}>
            {labels[item.acceptance.state]}
            {' · '}
            {quoteDate(item.issued_at)}
          </Text>

          <PaymentBadge
            quoteId={item.id}
            checkout={currentPayment}
          />
        </TouchableOpacity>
      ))}

      <Pagination
        meta={history.data?.meta}
        onPage={setPage}
      />

      {selected && (
        <ApiState {...detail} />
      )}

      {/* Detalle de la cotización */}
      {quote && (
        <View style={styles.agreed}>
          <Text style={styles.title}>
            Detalle de la cotización
          </Text>

          <AmountDetails amount={quote.amount} />

          <Text style={styles.body}>
            {labels[quote.acceptance.state]}
          </Text>

          <PaymentBadge
            quoteId={quote.id}
            checkout={currentPayment}
          />

          <Text style={styles.body}>
            Versión de precio {quote.price_version}
          </Text>

          {quote.acceptance.accepted_at ? (
            <Text style={styles.body}>
              Aceptada el{' '}
              {quoteDate(quote.acceptance.accepted_at)}
            </Text>
          ) : (
            <Text style={styles.body}>
              Vigencia para aceptar:{' '}
              {quoteDate(quote.expires_at)}
            </Text>
          )}

          {/* Aceptación original */}
          {canAccept &&
            !acceptanceUncertain &&
            (confirming ? (
              <>
                <Text style={styles.body}>
                  Al aceptar, acuerdas el importe de{' '}
                  {mxn(quote.amount.total_cents)}.
                  Esto no confirma un horario.
                </Text>

                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy}
                  style={styles.button}
                  onPress={() => void send('accept')}
                >
                  <Text style={styles.buttonText}>
                    Confirmar aceptación
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.action}
                  onPress={() => setConfirming(false)}
                >
                  <Text style={styles.link}>
                    Volver sin aceptar
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setConfirming(true)}
                style={styles.button}
              >
                <Text style={styles.buttonText}>
                  Revisar aceptación
                </Text>
              </TouchableOpacity>
            ))}

          {/* Revisión tras un resultado incierto */}
          {acceptanceUncertain &&
            quote.acceptance.state === 'pending' &&
            !detail.loading && (
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy || !canAccept}
                style={styles.action}
                onPress={() =>
                  setAcceptanceUncertain(false)
                }
              >
                <Text style={styles.link}>
                  Revisar la misma cotización
                </Text>
              </TouchableOpacity>
            )}
        </View>
      )}
    </View>
  );
}

// Etiqueta de estado de pago.
function PaymentBadge({
  quoteId,
  checkout,
}: {
  quoteId: string;
  checkout: DemoCheckout | null;
}) {
  const styles = useQuoteStyles();

  const state = quotePaymentView(quoteId, checkout);

  if (!state) return null;

  return (
    <View
      style={[
        styles.paymentBadge,
        state.tone === 'paid' && styles.paymentPaid,
        state.tone === 'warning' && styles.paymentWarning,
      ]}
    >
      <Text
        style={[
          styles.paymentLabel,
          state.tone === 'paid' && styles.paymentPaidLabel,
          state.tone === 'warning' &&
            styles.paymentWarningLabel,
        ]}
      >
        {state.label}
      </Text>
    </View>
  );
}

// Desglose original de importes.
function AmountDetails({
  amount,
}: {
  amount: Amount;
}) {
  const styles = useQuoteStyles();

  return (
    <>
      <Text style={styles.amount}>
        {mxn(amount.total_cents)}
      </Text>

      <Text style={styles.body}>
        Comisión Tekora 15 % incluida:{' '}
        {mxn(amount.commission_cents)}
      </Text>

      <Text style={styles.body}>
        Total para el prestador:{' '}
        {mxn(amount.provider_cents)}
      </Text>
    </>
  );
}

// Estilos compartidos para modo claro y oscuro.
function useQuoteStyles() {
  const { colors, darkMode } = useTekoraTheme();

  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      gap: 10,
    },

    title: {
      color: colors.text,
      fontWeight: 'bold',
      fontSize: 16,
    },

    amount: {
      color: darkMode ? '#90E0EF' : '#005B9F',
      fontWeight: 'bold',
      fontSize: 23,
    },

    body: {
      color: colors.muted,
      lineHeight: 20,
    },

    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
    },

    action: {
      paddingVertical: 8,
    },

    link: {
      color: darkMode ? '#90E0EF' : '#005B9F',
      fontWeight: '600',
    },

    agreed: {
      padding: 12,
      gap: 5,
      borderRadius: 12,
      backgroundColor: darkMode
        ? '#102B48'
        : '#F3F8FC',
    },

    listItem: {
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      gap: 4,
      backgroundColor: colors.surface,
    },

    button: {
      backgroundColor: '#005B9F',
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },

    buttonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },

    paymentBadge: {
      alignSelf: 'flex-start',
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: darkMode
        ? '#123856'
        : '#EAF4FC',
      borderWidth: 1,
      borderColor: darkMode
        ? '#275A77'
        : '#C7E1F2',
      marginTop: 5,
    },

    paymentPaid: {
      backgroundColor: darkMode
        ? '#143B30'
        : '#E8F8EE',
      borderColor: darkMode
        ? '#276C50'
        : '#B9E5CA',
    },

    paymentWarning: {
      backgroundColor: darkMode
        ? '#44321B'
        : '#FFF4E6',
      borderColor: darkMode
        ? '#806133'
        : '#F0D5A9',
    },

    paymentLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: darkMode
        ? '#90E0EF'
        : '#005B9F',
    },

    paymentPaidLabel: {
      color: darkMode
        ? '#8BE0B1'
        : '#176844',
    },

    paymentWarningLabel: {
      color: darkMode
        ? '#FFD18A'
        : '#935D1F',
    },
  });
}
