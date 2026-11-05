import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ReservaConfirmadaScreen() {
  const router = useRouter();
  const [modalPagoVisible, setModalPagoVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Cabecera */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tu reserva</Text>
        <TouchableOpacity onPress={() => router.replace('/tabs')} style={styles.iconButton}>
          <Ionicons name="close" size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Héroe: Icono y Mensaje de Éxito */}
        <View style={styles.heroSection}>
          <View style={styles.iconPlaceholder}>
            <Ionicons name="calendar" size={60} color="#90caf9" />
          </View>
          
          <View style={styles.badge}>
            <Ionicons name="checkmark" size={14} color="#005b9f" />
            <Text style={styles.badgeText}>RESERVA CONFIRMADA</Text>
          </View>
          
          <Text style={styles.title}>Listo, Ana. Nos vemos.</Text>
          <Text style={styles.subtitle}>Carlos ya tiene los detalles. Tu refrigerador está en buenas manos.</Text>
        </View>

        {/* Tarjeta de Detalles */}
        <View style={styles.card}>
          
          {/* Perfil del Técnico */}
          <View style={styles.techProfileRow}>
            <View style={styles.techAvatar}><Ionicons name="person" size={24} color="#ccc" /></View>
            <View style={styles.techInfo}>
              <Text style={styles.techName}>Carlos Mendoza</Text>
              <Text style={styles.techRole}>Especialista en refrigeración</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color="#008bb5" />
          </View>

          <View style={styles.divider} />

          {/* Lista de Detalles */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="calendar-outline" size={20} color="#005b9f" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Jueves 12 de noviembre de 2026</Text>
              <Text style={styles.detailSub}>Entre 10:00 y 12:00 h</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="hardware-chip-outline" size={20} color="#005b9f" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Diagnóstico de refrigerador</Text>
              <Text style={styles.detailSub}>Samsung · No enfría en la parte inferior</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconBox}>
              <Ionicons name="location-outline" size={20} color="#005b9f" />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Colima 145, int. 4</Text>
              <Text style={styles.detailSub}>Roma Norte, Cuauhtémoc, CDMX</Text>
            </View>
          </View>
        </View>

        {/* Tarjeta de Precio */}
        <View style={styles.priceCard}>
          <View>
            <Text style={styles.priceTitle}>Total de la visita</Text>
            <Text style={styles.priceSub}>Reserva RP-1248</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.priceAmount}>$350 MXN</Text>
            <Text style={styles.priceSub}>Pago protegido</Text>
          </View>
        </View>

      </ScrollView>

      {/* Botones Fijos Inferiores */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Conversar con Carlos</Text>
          <Ionicons name="chatbubble-outline" size={18} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryLink} onPress={() => setModalPagoVisible(true)}>
          <Ionicons name="shield-checkmark" size={16} color="#0073B4" style={{ marginRight: 6 }} />
          <Text style={styles.secondaryLinkText}>Proceder con el pago</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Leyenda de Pago Seguro */}
      <Modal animationType="fade" transparent={true} visible={modalPagoVisible} onRequestClose={() => setModalPagoVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalIconCircle}>
              <Ionicons name="lock-closed" size={32} color="#005b9f" />
            </View>
            
            <Text style={styles.modalTitle}>Pago Seguro Tekora</Text>
            <Text style={styles.modalText}>
              Tu dinero se <Text style={{fontWeight: 'bold'}}>congela de manera segura</Text>. Solo se le liberará al técnico hasta que el trabajo esté finalizado y ambas partes estén de acuerdo.
            </Text>
            <Text style={styles.modalTextSub}>
              Si el servicio no se concreta o hay un inconveniente, tu dinero será reembolsado.
            </Text>

           <TouchableOpacity style={styles.modalButton} onPress={() => {setModalPagoVisible(false);router.push('/tabs/pago');}}>
              <Text style={styles.modalButtonText}>Entendido, continuar a pagar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7f9' }, 
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f5f7f9' },
  iconButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  
  heroSection: { alignItems: 'center', marginBottom: 24 },
  iconPlaceholder: { width: 100, height: 100, marginBottom: 16, justifyContent: 'center', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e1f5fe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 16 },
  badgeText: { color: '#005b9f', fontSize: 11, fontWeight: 'bold', marginLeft: 6, letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
  
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
  
  techProfileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  techAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  techInfo: { flex: 1 },
  techName: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 2 },
  techRole: { fontSize: 13, color: '#666' },
  
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 20 },
  
  detailRow: { flexDirection: 'row', marginBottom: 20 },
  detailIconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#f0f4f8', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  detailTextContainer: { flex: 1, justifyContent: 'center' },
  detailLabel: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 2 },
  detailSub: { fontSize: 13, color: '#666' },
  
  priceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
  priceTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  priceAmount: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  priceSub: { fontSize: 12, color: '#009688', fontWeight: 'bold' },
  
  footer: { paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#f5f7f9' },
  primaryButton: { flexDirection: 'row', backgroundColor: '#0073B4', borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  secondaryLinkText: { color: '#0073B4', fontSize: 15, fontWeight: 'bold' },

  // Estilos del Modal de Pago
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  modalIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#e1f5fe', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12, textAlign: 'center' },
  modalText: { fontSize: 15, color: '#444', textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  modalTextSub: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalButton: { backgroundColor: '#005b9f', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, width: '100%', alignItems: 'center' },
  modalButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});