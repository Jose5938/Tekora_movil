
import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/api/client';
import {
  commandIntent,
  finishCommandIntent,
} from '@/api/command-intent';
import {
  isConversations,
  isMessagePage,
  markMessagesRead,
  messagesPath,
  normalizeMessage,
  sendMessage,
  type MessagePage,
} from '@/api/communications';
import { ApiError, errorMessage } from '@/api/http';
import {
  inquiryLabels,
  inquiryPath,
  isJourneyResource,
  type ContractingJourney,
} from '@/api/inquiries';
import { resourceId, type Resource } from '@/api/types';
import { useSession } from '@/auth/context';
import { ApiState, Pagination } from '@/components/api-state';
import NavegacionPersonalizada from '@/components/navegacion-personalizada';
import {
  ReservationButton,
  reservationStyles,
} from '@/components/reservation-ui';
import { useApiResource } from '@/hooks/use-api-resource';

// Tema global ya utilizado por Inicio y Notificaciones.
import { useTekoraTheme } from '@/theme/tekora-theme';

export default function ChatScreen() {
  const router = useRouter();
  const { inquiry } = useLocalSearchParams<{
    inquiry?: string;
  }>();
  const id = resourceId(inquiry);

  // Solo lectura de colores.
  const { colors, darkMode } = useTekoraTheme();

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: colors.background },
      ]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface },
        ]}
      >
        {id ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Volver a conversaciones"
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace('/tabs/chat')
            }
            style={styles.icon}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>
        ) : (
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={24}
            color={colors.primary}
          />
        )}

        <Text
          style={[
            styles.title,
            { color: colors.text },
          ]}
        >
          {id ? 'Conversación' : 'Mensajes'}
        </Text>
      </View>

      {id ? (
        <ConversationThread
          key={id}
          inquiryId={id}
        />
      ) : (
        <ConversationList />
      )}
    </SafeAreaView>
  );
}

function ConversationList() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { colors, darkMode } = useTekoraTheme();

  const result = useApiResource(
    `/conversations?page=${page}`,
    isConversations,
    true
  );

  useFocusEffect(result.retry);

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.listContent}
        style={{
          backgroundColor: colors.background,
        }}
      >
        <ApiState
          {...result}
          empty={result.data?.data.length === 0}
          emptyMessage="Todavía no tienes conversaciones."
        />

        {result.data?.data.map(item => (
          <TouchableOpacity
            key={item.inquiry_id}
            accessibilityRole="button"
            style={[
              reservationStyles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() =>
              router.push({
                pathname: '/tabs/chat',
                params: {
                  inquiry: item.inquiry_id,
                },
              })
            }
          >
            <Text
              style={[
                styles.title,
                { color: colors.text },
              ]}
            >
              {item.service_title}
            </Text>

            <Text
              style={[
                styles.meta,
                { color: colors.muted },
              ]}
            >
              Solicitud #{item.inquiry_id}
              {' · '}
              {inquiryLabels[item.status]}
            </Text>

            {item.unread_messages_count > 0 && (
              <Text
                style={[
                  reservationStyles.badge,
                  {
                    color: colors.primary,
                    backgroundColor: colors.accent,
                  },
                ]}
              >
                Sin leer: {item.unread_messages_count}
              </Text>
            )}
          </TouchableOpacity>
        ))}

        <Pagination
          meta={result.data?.meta}
          onPage={setPage}
        />

        <ReservationButton
          label="Actualizar conversaciones"
          onPress={result.retry}
        />

        <ReservationButton
          label="Mis reservas"
          onPress={() =>
            router.push('/tabs/reserva')
          }
        />
      </ScrollView>

      <NavegacionPersonalizada darkMode={darkMode} />
    </>
  );
}

function ConversationThread({
  inquiryId,
}: {
  inquiryId: number;
}) {
  const router = useRouter();
  const { user } = useSession();

  const { colors, darkMode } = useTekoraTheme();

  const [cursor, setCursor] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState<string>();

  const focused = useRef(false);
  const writing = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;

      return () => {
        focused.current = false;
      };
    }, [])
  );

  // Validaciones originales de los mensajes.
  const validate = useCallback(
    (value: unknown): value is MessagePage =>
      isMessagePage(value) &&
      value.data.every(
        message => message.inquiry_id === inquiryId
      ),
    [inquiryId]
  );

  const validateJourney = useCallback(
    (
      value: unknown
    ): value is Resource<ContractingJourney> =>
      isJourneyResource(value) &&
      value.data.inquiry.id === inquiryId,
    [inquiryId]
  );

  const result = useApiResource(
    messagesPath(inquiryId) +
      (cursor
        ? `?messages_cursor=${encodeURIComponent(cursor)}`
        : ''),
    validate,
    true
  );

  const journey = useApiResource(
    `${inquiryPath(inquiryId)}/journey`,
    validateJourney,
    true
  );

  const meta = result.data?.meta;

  const canSend =
    journey.data?.data.conversation.can_send === true;

  const unavailable = [
    result.error,
    journey.error,
  ].some(
    error =>
      error instanceof ApiError &&
      [401, 403, 404].includes(error.status)
  );

  // Función original de envío y lectura.
  // No se modifica su funcionamiento.
  async function act(kind: 'send' | 'read') {
    const body = normalizeMessage(draft);
    const token = meta?.read_token;

    if (
      !user ||
      writing.current ||
      !focused.current ||
      (kind === 'send'
        ? !body || !canSend
        : !token)
    ) {
      return;
    }

    const scope =
      `tekora.mobile.message.${user.id}.${inquiryId}`;

    writing.current = true;
    setBusy(true);
    setNotice(undefined);

    try {
      if (kind === 'read' && token) {
        await markMessagesRead(
          api,
          inquiryId,
          token
        );
      } else {
        const key = await commandIntent(
          scope,
          { body }
        );

        if (!focused.current) return;

        await sendMessage(
          api,
          inquiryId,
          body,
          key
        );

        await finishCommandIntent(scope);

        if (focused.current) {
          setDraft('');
          setCursor(null);
          setUncertain(false);
        }
      }
    } catch (error) {
      if (
        kind === 'send' &&
        error instanceof ApiError &&
        [409, 422].includes(error.status)
      ) {
        await finishCommandIntent(scope);

        if (focused.current) {
          setUncertain(false);
        }
      } else if (
        kind === 'send' &&
        focused.current &&
        (
          !(error instanceof ApiError) ||
          error.status >= 500 ||
          [
            'network',
            'invalid_response',
            'intent_pending',
          ].includes(error.code)
        )
      ) {
        setUncertain(true);
      }

      if (focused.current) {
        setNotice(errorMessage(error));
      }
    } finally {
      if (focused.current) {
        result.retry();
        journey.retry();
      }

      writing.current = false;
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[
        styles.thread,
        { backgroundColor: colors.background },
      ]}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        style={[
          styles.thread,
          { backgroundColor: colors.background },
        ]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {unavailable ? (
          <Text
            style={[
              styles.meta,
              { color: colors.muted },
            ]}
          >
            La conversación no está disponible
            para esta cuenta.
          </Text>
        ) : (
          <>
            {journey.data && (
              <Text
                style={[
                  styles.title,
                  { color: colors.text },
                ]}
              >
                {
                  journey.data.data.inquiry
                    .service_title
                }
              </Text>
            )}

            <ApiState {...journey} />

            <ApiState
              {...result}
              empty={result.data?.data.length === 0}
              emptyMessage="Todavía no hay mensajes en esta conversación."
            />

            {!!meta?.unread_messages_count && (
              <Text
                style={[
                  reservationStyles.badge,
                  {
                    color: colors.primary,
                    backgroundColor: colors.accent,
                  },
                ]}
              >
                Sin leer: {meta.unread_messages_count}
              </Text>
            )}

            {/* Mensajes originales, solo cambian los colores */}
            {result.data?.data
              .slice()
              .reverse()
              .map(item => (
                <View
                  key={item.id}
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: colors.surface,
                    },
                    item.is_mine && [
                      styles.outgoing,
                      {
                        backgroundColor: darkMode
                          ? '#0077B6'
                          : '#005B9F',
                      },
                    ],
                  ]}
                >
                  <Text
                    style={[
                      styles.message,
                      { color: colors.text },
                      item.is_mine &&
                        styles.outgoingText,
                    ]}
                  >
                    {item.body}
                  </Text>

                  <Text
                    style={[
                      styles.meta,
                      { color: colors.muted },
                      item.is_mine &&
                        styles.outgoingText,
                    ]}
                  >
                    {new Date(
                      item.created_at
                    ).toLocaleString('es-MX', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </Text>
                </View>
              ))}

            {meta?.read_token && (
              <ReservationButton
                label="Marcar página como leída"
                disabled={busy}
                onPress={() => void act('read')}
              />
            )}

            {meta?.next_cursor && (
              <ReservationButton
                label="Mensajes anteriores"
                disabled={busy}
                onPress={() =>
                  setCursor(meta.next_cursor)
                }
              />
            )}

            {meta?.previous_cursor && (
              <ReservationButton
                label="Mensajes más recientes"
                disabled={busy}
                onPress={() =>
                  setCursor(meta.previous_cursor)
                }
              />
            )}

            <ReservationButton
              label="Actualizar conversación"
              disabled={busy}
              onPress={() => {
                result.retry();
                journey.retry();
              }}
            />

            <ReservationButton
              label="Ver solicitud"
              onPress={() =>
                router.push({
                  pathname: '/tabs/solicitud',
                  params: { id: inquiryId },
                })
              }
            />
          </>
        )}
      </ScrollView>

      {/* Avisos de error originales */}
      {notice && (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.notice,
            { color: colors.error },
          ]}
        >
          {notice}
        </Text>
      )}

      {/* Compositor original: misma lógica de envío */}
      {!unavailable && canSend && (
        <View
          style={[
            styles.composer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <TextInput
            accessibilityLabel="Mensaje"
            placeholder="Escribe un mensaje"
            placeholderTextColor={colors.muted}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={2000}
            editable={!busy && !uncertain}
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
          />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              uncertain
                ? 'Reintentar el mismo mensaje'
                : 'Enviar mensaje'
            }
            disabled={
              busy ||
              !normalizeMessage(draft)
            }
            onPress={() => void act('send')}
            style={[
              styles.send,
              {
                backgroundColor: darkMode
                  ? '#0077B6'
                  : '#005B9F',
              },
            ]}
          >
            <Ionicons
              name="send"
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      )}

      {!unavailable &&
        journey.data &&
        !canSend && (
          <Text
            style={[
              styles.notice,
              { color: colors.muted },
            ]}
          >
            Esta conversación es de solo lectura.
          </Text>
        )}
    </KeyboardAvoidingView>
  );
}

// Los tamaños y la distribución son los originales.
// Los colores específicos se aplican desde el tema global.
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  icon: {
    padding: 6,
  },
  title: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  content: {
    padding: 16,
    gap: 12,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  thread: {
    flex: 1,
  },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '86%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  outgoing: {
    alignSelf: 'flex-end',
    backgroundColor: '#005b9f',
  },
  message: {
    color: '#1a1a1a',
    lineHeight: 20,
  },
  outgoingText: {
    color: '#fff',
  },
  meta: {
    color: '#555',
    fontSize: 13,
  },
  notice: {
    color: '#555',
    padding: 12,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#e5ecf3',
  },
  input: {
    flex: 1,
    maxHeight: 130,
    minHeight: 42,
    color: '#1a1a1a',
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    padding: 10,
  },
  send: {
    backgroundColor: '#005b9f',
    padding: 12,
    borderRadius: 12,
  },
});
