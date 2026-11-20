import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/api/client';
import { isNotifications, isUnreadCount, markNotificationRead, type Notification } from '@/api/communications';
import { errorMessage } from '@/api/http';
import { ApiState, Pagination } from '@/components/api-state';
import { ReservationButton, reservationStyles as styles } from '@/components/reservation-ui';
import { useApiResource } from '@/hooks/use-api-resource';

export default function NotificationsScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const writing = useRef(false);
  const list = useApiResource(`/notifications?page=${page}`, isNotifications, true);
  const count = useApiResource('/notifications/unread-count', isUnreadCount, true);
  useFocusEffect(list.retry);
  useFocusEffect(count.retry);

  async function mark(notification: Notification) {
    if (notification.read_at || writing.current) return;
    writing.current = true;
    setBusy(notification.id);
    setNotice(undefined);
    try { await markNotificationRead(api, notification); } catch (error) { setNotice(errorMessage(error)); }
    finally {
      list.retry();
      count.retry();
      writing.current = false;
      setBusy(undefined);
    }
  }

  return <SafeAreaView style={layout.safe}>
    <View style={layout.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver" style={layout.icon}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/tabs')}>
        <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
      </TouchableOpacity>
      <Text style={styles.title}>Notificaciones</Text>
    </View>
    <ScrollView contentContainerStyle={layout.content}>
      <ApiState {...count} />
      {count.data && <Text style={styles.badge}>Notificaciones sin leer: {count.data.data.unread_count}</Text>}
      <ApiState {...list} empty={list.data?.data.length === 0} emptyMessage="Todavía no tienes notificaciones." />
      {notice && <Text style={styles.error} accessibilityLiveRegion="polite">{notice}</Text>}
      {list.data?.data.map(item => <View key={item.id} style={styles.card}>
        <Text style={styles.title}>{item.label}</Text>
        <Text style={styles.text}>{item.read_at ? 'Leída' : 'Sin leer'} · {new Date(item.created_at).toLocaleString('es-MX')}</Text>
        <ReservationButton label="Ver detalle del aviso" onPress={() => router.push(item.resource.type === 'inquiry'
          ? { pathname: '/tabs/solicitud', params: { id: item.resource.id } }
          : { pathname: '/tabs/reserva', params: { id: item.resource.id } })} />
        {!item.read_at && <ReservationButton label="Marcar aviso como leído" disabled={!!busy} onPress={() => void mark(item)} />}
      </View>)}
      <Pagination meta={list.data?.meta} onPage={setPage} />
      <ReservationButton label="Actualizar notificaciones" onPress={() => { list.retry(); count.retry(); }} />
    </ScrollView>
  </SafeAreaView>;
}

const layout = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff' },
  icon: { padding: 6 },
  content: { padding: 16, gap: 12 },
});
