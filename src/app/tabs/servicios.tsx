import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NavegacionPersonalizada from '@/components/navegacion-personalizada';
import { useRouter } from 'expo-router';
import { ApiState, Pagination } from '@/components/api-state';
import { PreparationNotice } from '@/components/preparation-notice';
import { useApiResource } from '@/hooks/use-api-resource';
import { modalityLabels, type Collection, type Service } from '@/api/types';


export default function ServiciosScreen() {
  const [tabActiva, setTabActiva] = useState('catalogo');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const services = useApiResource<Collection<Service>>(`/services?page=${page}&q=${encodeURIComponent(search)}`);
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      
      {/* Cabecera */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Servicios</Text>
        <TouchableOpacity accessibilityLabel="Actualizar catálogo" style={styles.iconButton} onPress={services.retry}>
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
            La publicación de solicitudes está en preparación. Puedes conocer el formulario; todavía no se envían trabajos ni cotizaciones.
          </Text>
          <TouchableOpacity style={styles.boardButton} onPress={() => router.push('/tabs/publicar')}>
                <Text style={styles.boardButtonText}>Ver formulario en preparación</Text>
                <Ionicons name="arrow-forward" size={18} color="#002f5c" />
            </TouchableOpacity>
        </View>

        {/* Pestañas de Activos / Historial */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, tabActiva === 'catalogo' && styles.tabActive]}
            onPress={() => setTabActiva('catalogo')}
          >
            <Text style={[styles.tabText, tabActiva === 'catalogo' && styles.tabTextActive]}>Catálogo público</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, tabActiva === 'historial' && styles.tabActive]}
            onPress={() => setTabActiva('historial')}
          >
            <Text style={[styles.tabText, tabActiva === 'historial' && styles.tabTextActive]}>Historial</Text>
          </TouchableOpacity>
        </View>

        {tabActiva === 'catalogo' ? (
          <>
            <View style={styles.searchRow}>
              <TextInput style={styles.searchInput} accessibilityLabel="Buscar servicios" placeholder="Buscar servicios" value={query} onChangeText={setQuery} maxLength={120} returnKeyType="search" onSubmitEditing={() => { setSearch(query.trim()); setPage(1); }} />
              <TouchableOpacity accessibilityLabel="Buscar servicios" onPress={() => { setSearch(query.trim()); setPage(1); }}><Ionicons name="search-outline" size={24} color="#005b9f" /></TouchableOpacity>
            </View>
            <ApiState {...services} empty={services.data?.data.length === 0} />
            {services.data?.data.map(service => <ServiceCard key={service.id} service={service} onPress={() => router.push({ pathname: '/tabs/detalle-servicio', params: { id: service.id } })} />)}
            <Pagination meta={services.data?.meta} onPage={setPage} />
          </>
        ) : (
          <PreparationNotice>El historial de solicitudes y citas aún no está disponible. Aquí no se muestran reservas confirmadas.</PreparationNotice>
        )}

      </ScrollView>

      {/* Menú inferior */}
      <NavegacionPersonalizada />
    </SafeAreaView>
  );
}

const ServiceCard = ({ service, onPress }: { service: Service; onPress: () => void }) => {
  
  return (
    <TouchableOpacity 
      style={styles.serviceCard} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.serviceHeader}>
        <Text style={styles.serviceFolio}>{service.category.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: '#005b9f15' }]}>
          <Text style={[styles.statusText, { color: '#005b9f' }]}>{modalityLabels[service.modality]}</Text>
        </View>
      </View>
      
      <Text style={styles.deviceTitle}>{service.title}</Text>
      <Text style={styles.problemText} numberOfLines={3}>{service.description}</Text>
      
      <View style={styles.serviceFooter}>
        <View style={styles.footerRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.footerText}>{service.provider.display_name}</Text>
        </View>
        <View style={styles.footerRow}>
          <Ionicons name="information-circle-outline" size={16} color="#666" />
          <Text style={styles.footerText}>Ver detalle público</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#fff', marginBottom: 16 },
  searchInput: { flex: 1, color: '#333', fontSize: 15, padding: 4 },
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
