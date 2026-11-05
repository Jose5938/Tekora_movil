import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // 1. Importamos el router
import NavegacionPersonalizada from '@/components/navegacion-personalizada';
import { useSession } from '@/auth/context';
import { useApiResource } from '@/hooks/use-api-resource';
import { ApiState, Pagination } from '@/components/api-state';
import type { Collection, Provider } from '@/api/types';

export default function HomeScreen() {
  const router = useRouter(); // 2. Inicializamos el router

  const { user, logout } = useSession();
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const providers = useApiResource<Collection<Provider>>(`/providers?page=${page}&q=${encodeURIComponent(search)}`);
  const cerrarSesion = async () => {
    if (closing) return;
    setClosing(true);
    try { await logout(); } finally { setClosing(false); }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Cabecera: Ubicación, Notificaciones y Cerrar Sesión */}
        <View style={styles.header}>
          <View style={styles.locationContainer}>
            <View style={styles.locationIconWrapper}>
              <Ionicons name="location-outline" size={20} color="#005b9f" />
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>TEKORA</Text>
              <View style={styles.locationSelector}>
                <Text style={styles.locationValue}>Catálogo público</Text>
              </View>
            </View>
          </View>
          
          {/* Contenedor derecho para los iconos */}
          <View style={styles.headerRightIcons}>
            <TouchableOpacity accessibilityRole="button" disabled accessibilityLabel="Notificaciones en preparación" style={[styles.bellButton, { opacity: 0.5 }]}>
              <Ionicons name="notifications-outline" size={22} color="#1a1a1a" />
            </TouchableOpacity>
            
            {/* Botón de Cerrar Sesión */}
            <TouchableOpacity accessibilityLabel="Cerrar sesión" disabled={closing} style={styles.logoutButton} onPress={() => { void cerrarSesion(); }}>
              <Ionicons name="log-out-outline" size={24} color="#d9534f" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barra de Búsqueda */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#888" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar expertos (pulsa buscar)"
            placeholderTextColor="#888"
            value={query}
            onChangeText={setQuery}
            maxLength={120}
            returnKeyType="search"
            onSubmitEditing={() => { setSearch(query.trim()); setPage(1); }}
          />
          <TouchableOpacity accessibilityLabel="Buscar expertos" onPress={() => { setSearch(query.trim()); setPage(1); }}><Ionicons name="arrow-forward" size={20} color="#005b9f" /></TouchableOpacity>
        </View>

        {/* Banner Promocional */}
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerLogoText}>repara.</Text>
            <Text style={styles.bannerGreeting}>Hola, {user?.name}. Todo tiene solución.</Text>
            <Text style={styles.bannerTitle}>Tu hogar, en{'\n'}buenas manos.</Text>
            <View style={styles.bannerBadge}>
            <Ionicons name="people-outline" size={14} color="#005b9f" />
            <Text style={styles.bannerBadgeText}>Conoce a los prestadores</Text>
            </View>
          </View>
          <View style={styles.bannerImagePlaceholder}>
             <Ionicons name="image-outline" size={60} color="#99d6ea" />
             <Text style={styles.imageHint}>IMG Refri</Text>
          </View>
        </View>

        {/* Sección de Categorías */}
        <Text style={styles.sectionTitle}>Explora Tekora</Text>
        <View style={styles.categoriesContainer}>
          <CategoryItem icon="build-outline" label="Servicios" isActive onPress={() => router.push('/tabs/servicios')} />
          <CategoryItem icon="people-outline" label="Expertos" onPress={providers.retry} />
          <CategoryItem icon="chatbubble-outline" label="Mensajes" onPress={() => router.push('/tabs/chat')} />
          <CategoryItem icon="person-outline" label="Cuenta" onPress={() => router.push('/tabs/cuenta')} />
          <CategoryItem icon="clipboard-outline" label="Publicar" onPress={() => router.push('/tabs/publicar')} />
        </View>

        {/* Sección de Expertos */}
        <View style={styles.expertsHeader}>
          <Text style={styles.sectionTitle}>Expertos publicados</Text>
          <TouchableOpacity onPress={providers.retry}>
            <Text style={styles.seeAllText}>Actualizar</Text>
          </TouchableOpacity>
        </View>

        <ApiState {...providers} empty={providers.data?.data.length === 0} />
        {providers.data?.data.map(provider => <ExpertCard key={provider.id} provider={provider}
          onPress={() => router.push({ pathname: '/tabs/perfil-experto', params: { id: provider.id } })} />)}
        <Pagination meta={providers.data?.meta} onPage={setPage} />

      </ScrollView>
      <NavegacionPersonalizada />
    </SafeAreaView>
  );
}

const CategoryItem = ({ icon, label, isActive = false, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name'], label: string, isActive?: boolean, onPress: () => void }) => (
  <TouchableOpacity style={styles.categoryItem} onPress={onPress}>
    <View style={[styles.categoryIconContainer, isActive && styles.categoryIconActive]}>
      <Ionicons name={icon} size={28} color={isActive ? "#fff" : "#005b9f"} />
    </View>
    <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

const ExpertCard = ({ provider, onPress }: { provider: Provider, onPress: () => void }) => (
  <TouchableOpacity style={styles.expertCard} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.expertAvatarPlaceholder}>
      <Ionicons name="person" size={30} color="#ccc" />
    </View>
    <View style={styles.expertInfo}>
      <View style={styles.expertNameRow}>
        <Text style={styles.expertName}>{provider.display_name}</Text>
      </View>
      <Text style={styles.expertSubtitle}>{provider.headline ?? 'Presentación no publicada'}</Text>
      <Text style={styles.expertDetails} numberOfLines={2}>{provider.bio ?? 'Biografía no publicada'}</Text>
    </View>
    <View style={styles.expertPriceContainer}>
      <Ionicons name="chevron-forward" size={20} color="#005b9f" />
    </View>
  </TouchableOpacity>
);
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  locationContainer: { flexDirection: 'row', alignItems: 'center' },
  locationIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f4f8', justifyContent: 'center', alignItems: 'center' },
  locationTextContainer: { marginLeft: 10 },
  locationLabel: { fontSize: 10, color: '#888', fontWeight: '700', letterSpacing: 0.5 },
  locationSelector: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  locationValue: { fontSize: 14, fontWeight: 'bold', color: '#1a1a1a', marginRight: 4 },
  
  // Estilos nuevos para los botones derechos
  headerRightIcons: { flexDirection: 'row', alignItems: 'center' },
  bellButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  logoutButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fee', justifyContent: 'center', alignItems: 'center' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 24, borderWidth: 1, borderColor: '#eee', elevation: 2 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  banner: { backgroundColor: '#e1f5fe', borderRadius: 20, padding: 24, flexDirection: 'row', marginBottom: 30, position: 'relative', overflow: 'hidden' },
  bannerContent: { flex: 1, zIndex: 2 },
  bannerLogoText: { color: '#008bb5', fontWeight: '800', fontSize: 14, marginBottom: 8 },
  bannerGreeting: { color: '#008bb5', fontSize: 12, marginBottom: 4 },
  bannerTitle: { fontSize: 24, fontWeight: 'bold', color: '#002f5c', marginBottom: 12, lineHeight: 30 },
  bannerBadge: { flexDirection: 'row', alignItems: 'center' },
  bannerBadgeText: { color: '#005b9f', fontSize: 12, marginLeft: 4, fontWeight: '600' },
  bannerImagePlaceholder: { position: 'absolute', right: -20, bottom: -10, width: 140, height: 140, backgroundColor: '#b3e5fc', borderRadius: 70, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  imageHint: { fontSize: 10, color: '#005b9f', fontWeight: 'bold', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 16 },
  categoriesContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  categoryItem: { alignItems: 'center' },
  categoryIconContainer: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#eee', elevation: 2 },
  categoryIconActive: { backgroundColor: '#005b9f', borderColor: '#005b9f' },
  categoryLabel: { fontSize: 12, color: '#1a1a1a', fontWeight: '500' },
  categoryLabelActive: { color: '#005b9f', fontWeight: 'bold' },
  expertsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  seeAllText: { color: '#008bb5', fontWeight: 'bold', fontSize: 14 },
  expertCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee', elevation: 2 },
  expertAvatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  expertInfo: { flex: 1, justifyContent: 'center' },
  expertNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  expertName: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  expertSubtitle: { fontSize: 13, color: '#666', marginBottom: 4 },
  expertDetails: { fontSize: 12, color: '#888', fontWeight: '500' },
  expertPriceContainer: { alignItems: 'flex-end', justifyContent: 'center' },
  expertPrice: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  expertPriceLabel: { fontSize: 10, color: '#888', marginTop: 2 }
});
