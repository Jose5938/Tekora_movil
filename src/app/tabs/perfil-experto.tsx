import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import NavegacionPersonalizada from './navegador';

export default function PerfilExpertoScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  // Problemas activos del cliente (Simulación)
  const misProblemas = [
    { id: '1', titulo: 'La parte de abajo no enfría', equipo: 'Refrigerador Mabe', folio: 'RP-1248' },
    { id: '2', titulo: 'Hace ruido al exprimir', equipo: 'Lavadora Whirlpool', folio: 'LV-0932' }
  ];

  // Función que cierra el modal y manda al chat con el mensaje automático
  const confirmarSolicitud = (problema: any) => {
    setModalVisible(false);
    router.push({
      pathname: '/tabs/chat',
      params: { autoMsg: `Hola Carlos. Me gustaría solicitar tus servicios para mi ${problema.equipo}: "${problema.titulo}" (Folio: ${problema.folio}). ¿Podrías darme una cotización?` }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      
      {/* Cabecera Superior */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil del experto</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="heart-outline" size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Información Principal del Perfil */}
        <View style={styles.profileTop}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={40} color="#ccc" />
          </View>
          
          <View style={styles.nameContainer}>
            <Text style={styles.name}>Carlos Mendoza</Text>
            <Ionicons name="checkmark-circle" size={18} color="#005b9f" style={{ marginLeft: 4 }} />
          </View>
          <Text style={styles.specialty}>Especialista en Refrigeradores</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={16} color="#FFBA08" />
              <Text style={styles.statText}><Text style={styles.statBold}>4.9</Text> (128)</Text>
            </View>
            <Text style={styles.statDivider}>•</Text>
            <View style={styles.statItem}>
              <Ionicons name="briefcase-outline" size={16} color="#666" />
              <Text style={styles.statText}>8 años exp.</Text>
            </View>
            <Text style={styles.statDivider}>•</Text>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-done" size={16} color="#666" />
              <Text style={styles.statText}>450+ trab.</Text>
            </View>
          </View>
        </View>

        {/* Botones de Acción (Solicitar / Mensaje) */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.primaryButtonText}>Solicitar servicio</Text>
            <Text style={styles.primaryButtonSub}>$350 MXN · diag.</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/tabs/chat')}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#005b9f" />
          </TouchableOpacity>
        </View>

        {/* Sección: Sobre mí */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre mí</Text>
          <Text style={styles.aboutText}>
            Hola, soy Carlos. Tengo más de 8 años de experiencia reparando refrigeradores domésticos y comerciales. Trabajo rápido, limpio y ofrezco garantía de 30 días en todas mis reparaciones con piezas originales.
          </Text>
        </View>

        {/* Sección: Especialidades */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Especialidades</Text>
          <View style={styles.badgesContainer}>
            <View style={styles.badge}><Text style={styles.badgeText}>Refrigeradores</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>Congeladores</Text></View>
            <View style={styles.badge}><Text style={styles.badgeText}>Mantenimiento</Text></View>
          </View>
        </View>

        {/* Sección: Reseñas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reseñas (128)</Text>
            <TouchableOpacity><Text style={styles.seeAllText}>Ver todas</Text></TouchableOpacity>
          </View>
          
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewerAvatar}><Text style={styles.reviewerInitial}>M</Text></View>
              <View style={styles.reviewerInfo}>
                <Text style={styles.reviewerName}>Mariana L.</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons key={star} name="star" size={12} color="#FFBA08" />
                  ))}
                </View>
              </View>
              <Text style={styles.reviewDate}>Hace 2 días</Text>
            </View>
            <Text style={styles.reviewText}>
              Excelente servicio. Llegó puntual, revisó mi refri y tenía la pieza de repuesto lista. Muy amable y profesional.
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* Ventana Emergente (Modal) para seleccionar el problema */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>¿Para qué problema lo necesitas?</Text>
            <Text style={styles.modalSubtitle}>Selecciona una de tus solicitudes activas</Text>

            {misProblemas.map((prob) => (
              <TouchableOpacity key={prob.id} style={styles.problemOption} onPress={() => confirmarSolicitud(prob)}>
                <View style={styles.problemOptionIcon}>
                  <Ionicons name="build-outline" size={20} color="#005b9f" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.problemOptionTitle}>{prob.titulo}</Text>
                  <Text style={styles.problemOptionSub}>{prob.equipo} · {prob.folio}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Menú inferior */}
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