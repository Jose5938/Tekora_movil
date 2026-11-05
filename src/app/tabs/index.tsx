import React from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // 1. Importamos el router
import NavegacionPersonalizada from './navegador';

export default function HomeScreen() {
  const router = useRouter(); // 2. Inicializamos el router

  // 3. Función para cerrar sesión
  const cerrarSesion = () => {
    router.replace('/login');
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
              <Text style={styles.locationLabel}>TU UBICACIÓN</Text>
              <View style={styles.locationSelector}>
                <Text style={styles.locationValue}>Roma Norte, CDMX</Text>
                <Ionicons name="chevron-down" size={16} color="#1a1a1a" />
              </View>
            </View>
          </View>
          
          {/* Contenedor derecho para los iconos */}
          <View style={styles.headerRightIcons}>
            <TouchableOpacity style={styles.bellButton}>
              <Ionicons name="notifications-outline" size={22} color="#1a1a1a" />
            </TouchableOpacity>
            
            {/* Botón de Cerrar Sesión */}
            <TouchableOpacity style={styles.logoutButton} onPress={cerrarSesion}>
              <Ionicons name="log-out-outline" size={24} color="#d9534f" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barra de Búsqueda */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#888" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="¿Qué necesitas reparar?"
            placeholderTextColor="#888"
          />
        </View>

        {/* Banner Promocional */}
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerLogoText}>repara.</Text>
            <Text style={styles.bannerGreeting}>Hola, Ana. Todo tiene solución.</Text>
            <Text style={styles.bannerTitle}>Tu hogar, en{'\n'}buenas manos.</Text>
            <View style={styles.bannerBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#005b9f" />              
            <Text style={styles.bannerBadgeText}>Expertos verificados</Text>
            </View>
          </View>
          <View style={styles.bannerImagePlaceholder}>
             <Ionicons name="image-outline" size={60} color="#99d6ea" />
             <Text style={styles.imageHint}>IMG Refri</Text>
          </View>
        </View>

        {/* Sección de Categorías */}
        <Text style={styles.sectionTitle}>¿Qué equipo falló?</Text>
        <View style={styles.categoriesContainer}>
          <CategoryItem icon="snow-outline" label="Refris" isActive />
          <CategoryItem icon="hardware-chip-outline" label="Microondas" />
          <CategoryItem icon="laptop-outline" label="Cómputo" />
          <CategoryItem icon="phone-portrait-outline" label="Celulares" />
          <CategoryItem icon="home-outline" label="Hogar" />
        </View>

        {/* Sección de Expertos */}
        <View style={styles.expertsHeader}>
          <Text style={styles.sectionTitle}>Expertos cerca de ti</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        <ExpertCard 
          name="Carlos Mendoza"
          specialty="Refrigeradores"
          experience="8 años"
          rating="4.9"
          distance="1.2 km"
          availability="Mañana"
          price="$350"
          onPress={() => router.push('/tabs/perfil-experto')} 
        />
        
        <ExpertCard 
          name="Elena Ruiz"
          specialty="Electrodomésticos"
          experience="6 años"
          rating="4.9"
          distance="2.4 km"
          availability="Mañana"
          price="$390"
          onPress={() => router.push('/tabs/perfil-experto')} 
        />

      </ScrollView>
      <NavegacionPersonalizada />
    </SafeAreaView>
  );
}

const CategoryItem = ({ icon, label, isActive = false }: { icon: any, label: string, isActive?: boolean }) => (
  <TouchableOpacity style={styles.categoryItem}>
    <View style={[styles.categoryIconContainer, isActive && styles.categoryIconActive]}>
      <Ionicons name={icon} size={28} color={isActive ? "#fff" : "#005b9f"} />
    </View>
    <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>{label}</Text>
  </TouchableOpacity>
);

// Actualiza tu subcomponente ExpertCard así:
const ExpertCard = ({ name, specialty, experience, rating, distance, availability, price, onPress }: { name: string, specialty: string, experience: string, rating: string, distance: string, availability: string, price: string, onPress?: () => void }) => (
  <TouchableOpacity style={styles.expertCard} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.expertAvatarPlaceholder}>
      <Ionicons name="person" size={30} color="#ccc" />
    </View>
    <View style={styles.expertInfo}>
      <View style={styles.expertNameRow}>
        <Text style={styles.expertName}>{name}</Text>
        <Ionicons name="checkmark-circle" size={16} color="#005b9f" style={{marginLeft: 4}} />
      </View>
      <Text style={styles.expertSubtitle}>{specialty} · {experience}</Text>
      <Text style={styles.expertDetails}>
        <Ionicons name="star" size={12} color="#005b9f" /> {rating} · {distance} · {availability}
      </Text>
    </View>
    <View style={styles.expertPriceContainer}>
      <Text style={styles.expertPrice}>{price}</Text>
      <Text style={styles.expertPriceLabel}>MXN · diagnóstico</Text>
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