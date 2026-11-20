import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '@/api/http';
import { inquiryLabels, inquiryPath, isInquiryResource, isJourneyResource, type ContractingJourney, type Inquiry } from '@/api/inquiries';
import { resourceId, type Resource } from '@/api/types';
import { ApiState } from '@/components/api-state';
import { useApiResource } from '@/hooks/use-api-resource';

const stepLabels = {
  complete: 'Completada', current: 'En curso', pending: 'Pendiente', stopped: 'Detenida',
};

const dateLabel = (instant: string) => new Date(instant).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

export default function SolicitudScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const inquiryId = resourceId(id);
  const path = inquiryId ? inquiryPath(inquiryId) : null;
  const validateDetail = useCallback((value: unknown): value is Resource<Inquiry> =>
    isInquiryResource(value) && value.data.id === inquiryId, [inquiryId]);
  const validateJourney = useCallback((value: unknown): value is Resource<ContractingJourney> =>
    isJourneyResource(value) && value.data.inquiry.id === inquiryId, [inquiryId]);
  const detail = useApiResource(path, validateDetail, true);
  const journey = useApiResource(path && `${path}/journey`, validateJourney, true);
  const refresh = () => { detail.retry(); journey.retry(); };
  const unavailable = [detail.error, journey.error].some(error =>
    error instanceof ApiError && [401, 403, 404].includes(error.status));
  // The two responses can observe distinct states. Use the journey for its own summary.
  const inquiry = journey.data?.data.inquiry ?? detail.data?.data;

  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver" style={styles.iconButton}
        onPress={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/tabs/servicios', params: { vista: 'historial' } })}>
        <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
      </TouchableOpacity>
      <Text style={styles.heading}>Seguimiento</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Actualizar solicitud" style={styles.iconButton} onPress={refresh}>
        <Ionicons name="refresh-outline" size={24} color="#005b9f" />
      </TouchableOpacity>
    </View>

    <ScrollView style={styles.background} contentContainerStyle={styles.content}>
      {unavailable ? <ApiState loading={false} retry={refresh}
        error={new ApiError(404, 'not_found', 'La solicitud no está disponible para esta cuenta.')} /> : <>
        <ApiState {...detail} />
        {inquiry && <View style={styles.card}>
          <Text style={styles.meta}>Solicitud #{inquiry.id} · {inquiryLabels[inquiry.status]}</Text>
          <Text style={styles.heading}>{inquiry.service_title}</Text>
          <Text style={styles.body}>{inquiry.message}</Text>
          <Text style={styles.meta}>{dateLabel(inquiry.created_at)}</Text>
        </View>}
        <ApiState {...journey} />
        {journey.data && <JourneyDetails journey={journey.data.data} />}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function JourneyDetails({ journey }: { journey: ContractingJourney }) {
  const { next_action: action, progress, history } = journey;
  return <>
    <View style={styles.card}>
      <Text style={styles.heading}>Siguiente paso</Text>
      <Text style={styles.action}>{action.label}</Text>
      <Text style={styles.body}>{action.description}</Text>
      {action.interaction === 'navigate' && action.code !== 'read_history' &&
        <Text style={styles.meta}>{action.mobile_execution_available ? 'Esta acción aún no está integrada en la app.' : 'Esta acción solo está disponible fuera de la app.'}</Text>}
    </View>
    <View style={styles.card}>
      <Text style={styles.heading}>Progreso</Text>
      <Text style={styles.meta}>Prestador: {journey.participants.provider.display_name}</Text>
      {progress.steps.map(step => <View key={step.code}
        style={[styles.step, step.status === 'current' && styles.current]}>
        <Text style={styles.stepLabel}>{step.label}</Text>
        <Text style={styles.meta}>{stepLabels[step.status]}</Text>
      </View>)}
    </View>
    <View style={styles.card}>
      <Text style={styles.heading}>Historial de contratación</Text>
      {!history.inquiry.length && !history.reservations.length && <Text style={styles.meta}>Todavía no hay movimientos.</Text>}
      {history.inquiry.map((event, index) => <View key={`${event.occurred_at}-${index}`} style={styles.step}>
        <Text style={styles.stepLabel}>{event.label}</Text>
        <Text style={styles.meta}>{dateLabel(event.occurred_at)}</Text>
      </View>)}
      {history.reservations.map(reservation => <View key={reservation.id} style={styles.step}>
        <Text style={styles.stepLabel}>Reserva #{reservation.id} · {reservation.label}</Text>
        <Text style={styles.meta}>{reservation.local_date} · {reservation.local_start}–{reservation.local_end} ({reservation.timezone})</Text>
      </View>)}
    </View>
  </>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  iconButton: { padding: 6 },
  background: { backgroundColor: '#f8f9fa' },
  content: { padding: 20, gap: 14 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5ecf3', borderRadius: 16, padding: 16, gap: 10 },
  heading: { color: '#1a1a1a', fontWeight: 'bold', fontSize: 18 },
  body: { color: '#555', lineHeight: 21 },
  meta: { color: '#555', fontSize: 13 },
  action: { color: '#005b9f', fontSize: 16, fontWeight: 'bold' },
  step: { padding: 8, gap: 3, borderRadius: 8 },
  stepLabel: { color: '#1a1a1a', fontWeight: '600' },
  current: { backgroundColor: '#e1f5fe' },
});
