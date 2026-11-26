
import { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { api } from '@/api/client';
import {
  isNotifications,
  isUnreadCount,
  markNotificationRead,
  type Notification,
} from '@/api/communications';
import { errorMessage } from '@/api/http';
import { ApiState, Pagination } from '@/components/api-state';
import {
  ReservationButton,
  reservationStyles as styles,
} from '@/components/reservation-ui';
import { useApiResource } from '@/hooks/use-api-resource';

// Única importación nueva para el tema.
import { useTekoraTheme } from '@/theme/tekora-theme';

export default function NotificationsScreen() {
  const router = useRouter();

  // Leemos el mismo tema que se seleccionó en Inicio.
  const { darkMode, colors } = useTekoraTheme();

  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const writing = useRef(false);

  // Consultas originales.
  const list = useApiResource(
    `/notifications?page=${page}`,
    isNotifications,
    true
  );

  const count = useApiResource(
    '/notifications/unread-count',
    isUnreadCount,
    true
  );

  useFocusEffect(list.retry);
  useFocusEffect(count.retry);

  // Función original para marcar notificaciones.
  async function mark(notification: Notification) {
    if (notification.read_at || writing.current) return;

    writing.current = true;
    setBusy(notification.id);
    setNotice(undefined);

    try {
      await markNotificationRead(api, notification);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      list.retry();
      count.retry();
      writing.current = false;
      setBusy(undefined);
    }
  }

  return (
    <SafeAreaView
      style={[
        layout.safe,
        { backgroundColor: colors.background },
      ]}
    >
      {/* Encabezado */}
      <View
        style={[
          layout.header,
          { backgroundColor: colors.surface },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={layout.icon}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace('/tabs')
          }
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.title,
            { color: colors.text },
          ]}
        >
          Notificaciones
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={layout.content}
        style={{
          backgroundColor: colors.background,
        }}
      >
        {/* Conteo de notificaciones */}
        <ApiState {...count} />

        {count.data && (
          <Text
            style={[
              styles.badge,
              {
                color: colors.primary,
                backgroundColor: colors.accent,
              },
            ]}
          >
            Notificaciones sin leer:{' '}
            {count.data.data.unread_count}
          </Text>
        )}

        {/* Estados de carga y listado */}
        <ApiState
          {...list}
          empty={list.data?.data.length === 0}
          emptyMessage="Todavía no tienes notificaciones."
        />

        {/* Mensajes de error */}
        {notice && (
          <Text
            style={[
              styles.error,
              { color: colors.error },
            ]}
            accessibilityLiveRegion="polite"
          >
            {notice}
          </Text>
        )}

        {/* Notificaciones */}
        {list.data?.data.map(item => (
          <View
            key={item.id}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.title,
                { color: colors.text },
              ]}
            >
              {item.label}
            </Text>

            <Text
              style={[
                styles.text,
                { color: colors.muted },
              ]}
            >
              {item.read_at ? 'Leída' : 'Sin leer'}
              {' · '}
              {new Date(item.created_at).toLocaleString('es-MX')}
            </Text>

            {/* Botón original: ver detalle */}
            <ReservationButton
              label="Ver detalle del aviso"
              onPress={() =>
                router.push(
                  item.resource.type === 'inquiry'
                    ? {
                        pathname: '/tabs/solicitud',
                        params: { id: item.resource.id },
                      }
                    : {
                        pathname: '/tabs/reserva',
                        params: { id: item.resource.id },
                      }
                )
              }
            />

            {/* Botón original: marcar como leído */}
            {!item.read_at && (
              <ReservationButton
                label="Marcar aviso como leído"
                disabled={!!busy}
                onPress={() => void mark(item)}
              />
            )}
          </View>
        ))}

        {/* Paginación original */}
        <Pagination
          meta={list.data?.meta}
          onPage={setPage}
        />

        {/* Botón original: actualizar */}
        <ReservationButton
          label="Actualizar notificaciones"
          onPress={() => {
            list.retry();
            count.retry();
          }}
        />

        {/* Indicador visual discreto */}
        <Text
          style={[
            layout.themeLabel,
            { color: colors.muted },
          ]}
        >
          {darkMode ? 'Tekora · Modo oscuro' : 'Tekora · Modo claro'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const layout = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  header: {
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  icon: {
    padding: 6,
  },

  content: {
    padding: 16,
    gap: 12,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },

  themeLabel: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 12,
    marginBottom: 8,
  },
});
