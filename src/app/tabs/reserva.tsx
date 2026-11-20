import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { isReservationCollection, reservationLabels } from '@/api/reservations';
import { resourceId } from '@/api/types';
import { ApiState, Pagination } from '@/components/api-state';
import { ReservationDetail } from '@/components/reservation-detail';
import { ReservationProposal } from '@/components/reservation-proposal';
import { ReservationButton, reservationStyles } from '@/components/reservation-ui';
import { useApiResource } from '@/hooks/use-api-resource';

export default function ReservaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; inquiry?: string }>();
  const id = resourceId(params.id);
  const inquiry = resourceId(params.inquiry);

  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityLabel="Volver" onPress={() => router.canGoBack() ? router.back() : router.replace('/tabs')} style={styles.iconButton}>
        <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{id ? 'Tu reserva' : inquiry ? 'Propuesta de horario' : 'Mis reservas'}</Text>
      <TouchableOpacity accessibilityLabel="Ir a inicio" onPress={() => router.replace('/tabs')} style={styles.iconButton}>
        <Ionicons name="close" size={24} color="#1a1a1a" />
      </TouchableOpacity>
    </View>
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {id ? <ReservationDetail key={id} id={id} /> : inquiry ? <ReservationProposal key={inquiry} inquiryId={inquiry} /> :
        <ReservationHistory />}
    </ScrollView>
  </SafeAreaView>;
}

function ReservationHistory() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const history = useApiResource(`/reservations?page=${page}`, isReservationCollection, true);
  return <>
    <View style={styles.heroSection}>
      <Ionicons name="calendar" size={60} color="#90caf9" />
      <Text style={styles.headerTitle}>Historial de reservas</Text>
    </View>
    <ApiState {...history} empty={history.data?.data.length === 0} emptyMessage="Todavía no tienes reservas." />
    {history.data?.data.map(item => <TouchableOpacity key={item.id} accessibilityRole="button"
      style={reservationStyles.card} onPress={() => router.push({ pathname: '/tabs/reserva', params: { id: item.id } })}>
      <Text style={reservationStyles.title}>Reserva #{item.id}</Text>
      <Text style={reservationStyles.badge}>{reservationLabels[item.status]}</Text>
      <Text style={reservationStyles.text}>{item.date} · {item.time}–{item.end_time} ({item.timezone})</Text>
    </TouchableOpacity>)}
    <Pagination meta={history.data?.meta} onPage={setPage} />
    <ReservationButton label="Actualizar reservas" onPress={history.retry} />
  </>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  iconButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40, gap: 14 },
  heroSection: { alignItems: 'center', marginBottom: 10, gap: 8 },
});
