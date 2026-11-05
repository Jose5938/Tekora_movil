import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import NavegacionPersonalizada from '@/components/navegacion-personalizada';
import { useApiResource } from '@/hooks/use-api-resource';
import { ApiState } from '@/components/api-state';
import { PreparationNotice } from '@/components/preparation-notice';
import { resourceId, type Provider, type Resource } from '@/api/types';

export default function PerfilExpertoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const providerId = resourceId(id);
  const resource = useApiResource<Resource<Provider>>(providerId ? `/providers/${providerId}` : null);
  const provider = resource.data?.data;
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Volver" onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil del experto</Text>
        <TouchableOpacity accessibilityRole="button" disabled accessibilityLabel="Favoritos en preparación" style={[styles.iconButton, { opacity: 0.5 }]}>
          <Ionicons name="heart-outline" size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ApiState {...resource} />
        {provider && <>
          <View style={styles.profileTop}>
            <View style={styles.avatarPlaceholder}><Ionicons name="person" size={40} color="#ccc" /></View>
            <View style={styles.nameContainer}><Text style={styles.name}>{provider.display_name}</Text></View>
            <Text style={styles.specialty}>{provider.headline ?? 'Presentación no publicada'}</Text>
            <View style={styles.statsRow}><Text style={styles.statText}>Perfil público del prestador</Text></View>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setModalVisible(true)}>
              <Text style={styles.primaryButtonText}>Solicitar servicio</Text>
              <Text style={styles.primaryButtonSub}>En preparación</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Ver chat en preparación" style={styles.secondaryButton} onPress={() => router.push('/tabs/chat')}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#005b9f" />
            </TouchableOpacity>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre mí</Text>
            <Text style={styles.aboutText}>{provider.bio ?? 'Biografía no publicada'}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Presentación</Text>
            <View style={styles.badgesContainer}><View style={styles.badge}><Text style={styles.badgeText}>{provider.headline ?? 'Sin presentación'}</Text></View></View>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reseñas</Text>
            <View style={styles.reviewCard}><Text style={styles.reviewText}>Las reseñas y calificaciones aún no están disponibles.</Text></View>
          </View>
        </>}
      </ScrollView>
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Solicitudes en preparación</Text>
          <PreparationNotice>Todavía no es posible solicitar, reservar ni enviar mensajes al prestador desde la app.</PreparationNotice>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text style={styles.cancelButtonText}>Entendido</Text></TouchableOpacity>
        </View></View>
      </Modal>
      <NavegacionPersonalizada />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  iconButton: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  container: { flex: 1, backgroundColor: '#f8f9fa' }, // Fondo ligeramente gris para contrastar tarjetas
  scrollContent: { paddingBottom: 100 },
  
  profileTop: { alignItems: 'center', backgroundColor: '#fff', paddingVertical: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  specialty: { fontSize: 14, color: '#666', marginBottom: 16 },
  
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7f9', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: 13, color: '#444', marginLeft: 4 },
  statBold: { fontWeight: 'bold', color: '#1a1a1a' },
  statDivider: { marginHorizontal: 12, color: '#ccc' },
  
  actionsRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 20, marginBottom: 8, gap: 12 },
  primaryButton: { flex: 1, backgroundColor: '#005b9f', borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  primaryButtonSub: { color: '#e1f5fe', fontSize: 11, marginTop: 2 },
  secondaryButton: { width: 56, height: 56, backgroundColor: '#e1f5fe', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#b3e5fc' },
  
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  seeAllText: { color: '#008bb5', fontWeight: 'bold', fontSize: 14 },
  aboutText: { fontSize: 14, color: '#555', lineHeight: 22 },
  
  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  badge: { backgroundColor: '#f0f4f8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e4ebf1' },
  badgeText: { color: '#005b9f', fontSize: 13, fontWeight: '500' },
  
  reviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#eee', elevation: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  reviewerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e1e1e1', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  reviewerInitial: { fontSize: 16, fontWeight: 'bold', color: '#666' },
  reviewerInfo: { flex: 1 },
  reviewerName: { fontSize: 14, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 2 },
  starsRow: { flexDirection: 'row', gap: 2 },
  reviewDate: { fontSize: 12, color: '#999' },
  reviewText: { fontSize: 13, color: '#555', lineHeight: 20 },

  // Estilos del Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  problemOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  problemOptionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e1f5fe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  problemOptionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  problemOptionSub: { fontSize: 13, color: '#666', marginTop: 2 },
  cancelButton: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  cancelButtonText: { fontSize: 15, fontWeight: 'bold', color: '#d9534f' },
});