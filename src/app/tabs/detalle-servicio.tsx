import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApiResource } from '@/hooks/use-api-resource';
import { ApiState } from '@/components/api-state';
import { PreparationNotice } from '@/components/preparation-notice';
import { modalityLabels, resourceId, type Resource, type Service } from '@/api/types';

export default function DetalleServicioScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const serviceId = resourceId(id);
  const resource = useApiResource<Resource<Service>>(serviceId ? `/services/${serviceId}` : null);
  const service = resource.data?.data;
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Volver" onPress={() => router.back()} style={styles.iconButton}><Ionicons name="arrow-back" size={24} color="#1a1a1a" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del servicio</Text>
        <TouchableOpacity accessibilityLabel="Actualizar servicio" style={styles.iconButton} onPress={resource.retry}><Ionicons name="refresh-outline" size={24} color="#1a1a1a" /></TouchableOpacity>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ApiState {...resource} />
        {service && <>
          <View style={styles.specsCard}>
            <View style={styles.specsHeader}>
              <Text style={styles.folioText}>Servicio #{service.id}</Text>
              <View style={styles.statusBadge}><Text style={styles.statusText}>Catálogo público</Text></View>
            </View>
            <View style={styles.tagContainer}><Ionicons name="build-outline" size={16} color="#005b9f" /><Text style={styles.tagText}>{service.category.name}</Text></View>
            <Text style={styles.problemTitle}>{service.title}</Text>
            <Text style={styles.problemDescription}>{service.description}</Text>
            <View style={styles.divider} />
            <View style={styles.infoRow}><Ionicons name="laptop-outline" size={18} color="#666" /><Text style={styles.infoText}>{modalityLabels[service.modality]}</Text></View>
          </View>
          <View style={styles.suggestedHeader}><Text style={styles.sectionTitle}>Prestador del servicio</Text></View>
          <View style={styles.expertCard}>
            <View style={styles.expertAvatarPlaceholder}><Ionicons name="person" size={28} color="#ccc" /></View>
            <View style={styles.expertInfo}>
              <View style={styles.expertNameRow}><Text style={styles.expertName}>{service.provider.display_name}</Text></View>
              <Text style={styles.expertSubtitle}>{service.provider.headline ?? 'Presentación no publicada'}</Text>
              <Text style={styles.expertDetails}>{service.provider.bio ?? 'Biografía no publicada'}</Text>
            </View>
            <View style={styles.expertActionContainer}>
              <TouchableOpacity style={styles.contactButton} onPress={() => router.push({ pathname: '/tabs/perfil-experto', params: { id: service.provider.id } })}><Text style={styles.contactButtonText}>Ver perfil</Text></TouchableOpacity>
            </View>
          </View>
          <PreparationNotice>Las reservas, cotizaciones y pagos aún no están disponibles. Consultar este servicio no crea una solicitud.</PreparationNotice>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff' },
  iconButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  
  specsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 30, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, borderWidth: 1, borderColor: '#eee' },
  specsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  folioText: { fontSize: 13, color: '#888', fontWeight: 'bold' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFBA0820', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFBA08', marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#b38200' },
  
  tagContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e1f5fe', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 12 },
  tagText: { color: '#005b9f', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  
  problemTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  problemDescription: { fontSize: 15, color: '#555', fontStyle: 'italic', lineHeight: 22, marginBottom: 16 },
  
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { fontSize: 14, color: '#666', marginLeft: 10 },
  
  suggestedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  sectionSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  
  expertCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee', elevation: 1 },
  expertAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  expertInfo: { flex: 1, justifyContent: 'center' },
  expertNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  expertName: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  expertSubtitle: { fontSize: 12, color: '#666', marginBottom: 4 },
  expertDetails: { fontSize: 12, color: '#888', fontWeight: '500' },
  expertActionContainer: { alignItems: 'flex-end', justifyContent: 'space-between' },
  expertPrice: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  contactButton: { backgroundColor: '#005b9f', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginTop: 8 },
  contactButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});