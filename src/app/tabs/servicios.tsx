import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NavegacionPersonalizada from './navegador';
import { useRouter } from 'expo-router';


export default function ServiciosScreen() {
  const [tabActiva, setTabActiva] = useState('activos');
    const router = useRouter();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      
      {/* Cabecera */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Servicios</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="search-outline" size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* El Tablero  - Tarjeta para publicar un problema */}
        <View style={styles.witcherBoardCard}>
          <View style={styles.boardHeader}>
            <Ionicons name="clipboard" size={24} color="#FFBA08" />
            <Text style={styles.boardTitle}>Tablero de Solicitudes</Text>
          </View>
          <Text style={styles.boardDescription}>
            ¿No estás seguro de cuál es la falla? Describe el problema de tu equipo y deja que los expertos te envíen sus propuestas y cotizaciones.
          </Text>
          <TouchableOpacity style={styles.boardButton} onPress={() => router.push('/tabs/publicar')}>
                <Text style={styles.boardButtonText}>Publicar un trabajo</Text>
                <Ionicons name="arrow-forward" size={18} color="#002f5c" />
            </TouchableOpacity>
        </View>

        {/* Pestañas de Activos / Historial */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, tabActiva === 'activos' && styles.tabActive]}
            onPress={() => setTabActiva('activos')}
          >
            <Text style={[styles.tabText, tabActiva === 'activos' && styles.tabTextActive]}>Activos (2)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, tabActiva === 'historial' && styles.tabActive]}
            onPress={() => setTabActiva('historial')}
          >
            <Text style={[styles.tabText, tabActiva === 'historial' && styles.tabTextActive]}>Historial</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Servicios (Simulación de contenido) */}
        {tabActiva === 'activos' ? (
          <>
            <ServiceCard 
              folio="RP-1248"
              device="Refrigerador Mabe"
              problem="La parte de abajo no enfría"
              status="Técnico confirmado"
              techName="Carlos Mendoza"
              date="12 Nov · 10:00 - 12:00 h"
              statusColor="#005b9f"
            />
            <ServiceCard 
              folio="LV-0932"
              device="Lavadora Whirlpool"
              problem="Hace ruido al exprimir"
              status="Esperando propuestas"
              techName="Buscando experto..."
              date="Sin fecha asignada"
              statusColor="#FFBA08"
              isPending
            />
          </>
        ) : (
          <>
            <ServiceCard 
              folio="MC-0105"
              device="Microondas LG"
              problem="No calienta la comida"
              status="Completado"
              techName="Elena Ruiz"
              date="05 Oct · 14:00 h"
              statusColor="#009688"
            />
          </>
        )}

      </ScrollView>

      {/* Menú inferior */}
      <NavegacionPersonalizada />
    </SafeAreaView>
  );
}

// Subcomponente para la Tarjeta de Servicio
// Modifica el subcomponente ServiceCard así:
const ServiceCard = ({ folio, device, problem, status, techName, date, statusColor, isPending = false }: any) => {
  const router = useRouter(); // Necesario para navegar
  
  return (
    <TouchableOpacity 
      style={styles.serviceCard} 
      onPress={() => router.push('/tabs/detalle-servicio')} 
      activeOpacity={0.7}
    >
      <View style={styles.serviceHeader}>
        <Text style={styles.serviceFolio}>Folio: {folio}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
        </View>
      </View>
      
      <Text style={styles.deviceTitle}>{device}</Text>
      <Text style={styles.problemText}>"{problem}"</Text>
      
      <View style={styles.serviceFooter}>
        <View style={styles.footerRow}>
          <Ionicons name={isPending ? "search-outline" : "person-outline"} size={16} color="#666" />
          <Text style={styles.footerText}>{techName}</Text>
        </View>
        <View style={styles.footerRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.footerText}>{date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  iconButton: { padding: 4 },
  
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  
  // Estilos del "Tablero de The Witcher"
  witcherBoardCard: { backgroundColor: '#002f5c', borderRadius: 20, padding: 20, marginBottom: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },
  boardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  boardTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginLeft: 8 },
  boardDescription: { fontSize: 13, color: '#e1f5fe', lineHeight: 20, marginBottom: 16 },
  boardButton: { flexDirection: 'row', backgroundColor: '#FFBA08', alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center' },
  boardButtonText: { color: '#002f5c', fontWeight: 'bold', fontSize: 14, marginRight: 6 },
  
  // Pestañas
  tabsContainer: { flexDirection: 'row', backgroundColor: '#e4ebf1', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#005b9f' },
  
  // Tarjetas de Servicio
  serviceCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  serviceFolio: { fontSize: 12, color: '#888', fontWeight: 'bold' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  
  deviceTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  problemText: { fontSize: 14, color: '#555', fontStyle: 'italic', marginBottom: 16 },
  
  serviceFooter: { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12, gap: 8 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 13, color: '#666', marginLeft: 8 },
});