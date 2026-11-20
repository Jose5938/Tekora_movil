import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { inquiryLabels, isInquiryCollection } from '@/api/inquiries';
import { useApiResource } from '@/hooks/use-api-resource';
import { ApiState, Pagination } from '@/components/api-state';

export function InquiryHistory() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const history = useApiResource(`/inquiries?page=${page}`, isInquiryCollection, true);
  const retry = history.retry;
  useFocusEffect(retry);
  const refresh = useCallback(() => {
    setPage(1);
    retry();
  }, [retry]);

  return <>
    <View style={styles.header}>
      <Text style={styles.title}>Mis solicitudes</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Actualizar historial" onPress={refresh} style={styles.refresh}>
        <Ionicons name="refresh-outline" size={22} color="#005b9f" />
      </TouchableOpacity>
    </View>
    <ApiState {...history} empty={history.data?.data.length === 0} emptyMessage="Todavía no tienes solicitudes." />
    {history.data?.data.map(inquiry => (
      <TouchableOpacity key={inquiry.id} accessibilityRole="button"
        accessibilityLabel={`Solicitud #${inquiry.id}: ${inquiry.service_title}, ${inquiryLabels[inquiry.status]}`}
        style={styles.card} onPress={() => router.push({ pathname: '/tabs/solicitud', params: { id: inquiry.id } })}>
        <View style={styles.row}>
          <Text style={styles.folio}>Solicitud #{inquiry.id}</Text>
          <Text style={styles.status}>{inquiryLabels[inquiry.status]}</Text>
        </View>
        <Text style={styles.title}>{inquiry.service_title}</Text>
        <Text style={styles.message} numberOfLines={2}>{inquiry.message}</Text>
        <View style={styles.row}>
          <Text style={styles.link}>Ver seguimiento</Text>
          <Ionicons name="chevron-forward" size={18} color="#005b9f" />
        </View>
      </TouchableOpacity>
    ))}
    <Pagination meta={history.data?.meta} onPage={setPage} />
  </>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  refresh: { padding: 8 },
  card: { padding: 16, marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: '#e5ecf3', backgroundColor: '#fff', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a' },
  folio: { fontWeight: 'bold', color: '#555' },
  status: { color: '#005b9f', backgroundColor: '#e1f5fe', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10 },
  message: { color: '#555', lineHeight: 20 },
  link: { color: '#005b9f', fontWeight: '600' },
});
