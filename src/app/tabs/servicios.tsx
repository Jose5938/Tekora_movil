
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NavegacionPersonalizada from '@/components/navegacion-personalizada';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiState, Pagination } from '@/components/api-state';
import { InquiryHistory } from '@/components/inquiry-history';
import { useApiResource } from '@/hooks/use-api-resource';
import { catalogPath, isCategories } from '@/api/catalog';
import {
  isServiceCollection,
  modalityLabels,
  type Service,
} from '@/api/types';
import { useTekoraTheme } from '@/theme/tekora-theme';

export default function ServiciosScreen() {
  const { vista } = useLocalSearchParams<{ vista?: string }>();
  const tabActiva = vista === 'historial' ? 'historial' : 'catalogo';

  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');

  // Consultas originales.
  const services = useApiResource(
    tabActiva === 'catalogo'
      ? catalogPath('/services', page, search, category)
      : null,
    isServiceCollection
  );

  const categories = useApiResource(
    tabActiva === 'catalogo' ? '/categories' : null,
    isCategories
  );

  const router = useRouter();

  // Tema global de Tekora.
  const { colors, darkMode } = useTekoraTheme();

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
      edges={['top']}
    >
      {/* Cabecera */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface },
        ]}
      >
        <Text
          style={[
            styles.headerTitle,
            { color: colors.text },
          ]}
        >
          Servicios
        </Text>

        {tabActiva === 'catalogo' && (
          <TouchableOpacity
            accessibilityLabel="Actualizar catálogo"
            style={styles.iconButton}
            onPress={services.retry}
          >
            <Ionicons
              name="search-outline"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tarjeta original de publicar trabajo */}
        <View
          style={[
            styles.witcherBoardCard,
            {
              backgroundColor: darkMode
                ? '#102B48'
                : '#002F5C',
            },
          ]}
        >
          <View style={styles.boardHeader}>
            <Ionicons
              name="clipboard"
              size={24}
              color="#FFBA08"
            />
            <Text style={styles.boardTitle}>
              Publicar trabajo
            </Text>
          </View>

          <Text style={styles.boardDescription}>
            Para solicitar un servicio, abre su ficha en el
            catálogo. La publicación abierta de trabajos
            sigue en preparación.
          </Text>

          <TouchableOpacity
            style={styles.boardButton}
            onPress={() => router.push('/tabs/publicar')}
          >
            <Text style={styles.boardButtonText}>
              Consultar disponibilidad
            </Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color="#002f5c"
            />
          </TouchableOpacity>
        </View>

        {/* Pestañas originales: Catálogo / Historial */}
        <View
          style={[
            styles.tabsContainer,
            {
              backgroundColor: darkMode
                ? '#102B48'
                : '#E4EBF1',
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tab,
              tabActiva === 'catalogo' && styles.tabActive,
              tabActiva === 'catalogo' && {
                backgroundColor: colors.surface,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{
              selected: tabActiva === 'catalogo',
            }}
            onPress={() =>
              router.setParams({ vista: 'catalogo' })
            }
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.muted },
                tabActiva === 'catalogo' && [
                  styles.tabTextActive,
                  { color: colors.primary },
                ],
              ]}
            >
              Catálogo público
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              tabActiva === 'historial' && styles.tabActive,
              tabActiva === 'historial' && {
                backgroundColor: colors.surface,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{
              selected: tabActiva === 'historial',
            }}
            onPress={() =>
              router.setParams({ vista: 'historial' })
            }
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.muted },
                tabActiva === 'historial' && [
                  styles.tabTextActive,
                  { color: colors.primary },
                ],
              ]}
            >
              Historial
            </Text>
          </TouchableOpacity>
        </View>

        {tabActiva === 'catalogo' ? (
          <>
            {/* Búsqueda original */}
            <View
              style={[
                styles.searchRow,
                {
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.searchInput,
                  { color: colors.text },
                ]}
                accessibilityLabel="Buscar servicios"
                placeholder="Buscar servicios"
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={setQuery}
                maxLength={120}
                returnKeyType="search"
                onSubmitEditing={() => {
                  setSearch(query.trim());
                  setPage(1);
                }}
              />

              <TouchableOpacity
                accessibilityLabel="Buscar servicios"
                onPress={() => {
                  setSearch(query.trim());
                  setPage(1);
                }}
              >
                <Ionicons
                  name="search-outline"
                  size={24}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>

            <ApiState {...categories} />

            {/* Filtros originales */}
            {categories.data && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.categoryRow}
              >
                {[
                  { id: 0, slug: '', name: 'Todas' },
                  ...categories.data.data,
                ].map(item => (
                  <TouchableOpacity
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: category === item.slug,
                    }}
                    style={[
                      styles.category,
                      {
                        backgroundColor: colors.surface,
                      },
                      category === item.slug && [
                        styles.activeCategory,
                        {
                          backgroundColor: colors.accent,
                        },
                      ],
                    ]}
                    onPress={() => {
                      setCategory(item.slug);
                      setPage(1);
                    }}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        { color: colors.primary },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Resultados originales */}
            <ApiState
              {...services}
              empty={services.data?.data.length === 0}
            />

            {services.data?.data.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                onPress={() =>
                  router.push({
                    pathname: '/tabs/detalle-servicio',
                    params: { id: service.id },
                  })
                }
              />
            ))}

            <Pagination
              meta={services.data?.meta}
              onPage={setPage}
            />
          </>
        ) : (
          /* Historial original, sin modificar sus funciones */
          <InquiryHistory />
        )}
      </ScrollView>

      {/* Barra inferior sincronizada */}
      <NavegacionPersonalizada darkMode={darkMode} />
    </SafeAreaView>
  );
}

const ServiceCard = ({
  service,
  onPress,
}: {
  service: Service;
  onPress: () => void;
}) => {
  const { colors } = useTekoraTheme();

  return (
    <TouchableOpacity
      style={[
        styles.serviceCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.serviceHeader}>
        <Text
          style={[
            styles.serviceFolio,
            { color: colors.muted },
          ]}
        >
          {service.category.name}
        </Text>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: colors.accent },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: colors.primary },
            ]}
          >
            {modalityLabels[service.modality]}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.deviceTitle,
          { color: colors.text },
        ]}
      >
        {service.title}
      </Text>

      <Text
        style={[
          styles.problemText,
          { color: colors.muted },
        ]}
        numberOfLines={3}
      >
        {service.description}
      </Text>

      <View
        style={[
          styles.serviceFooter,
          { borderTopColor: colors.border },
        ]}
      >
        <View style={styles.footerRow}>
          <Ionicons
            name="person-outline"
            size={16}
            color={colors.muted}
          />
          <Text
            style={[
              styles.footerText,
              { color: colors.muted },
            ]}
          >
            {service.provider.display_name}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={colors.muted}
          />
          <Text
            style={[
              styles.footerText,
              { color: colors.muted },
            ]}
          >
            Ver detalle público
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Dimensiones originales conservadas.
const styles = StyleSheet.create({
  categoryRow: {
    gap: 8,
    paddingBottom: 15,
  },
  category: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  activeCategory: {
    backgroundColor: '#e1f5fe',
  },
  categoryText: {
    color: '#005b9f',
    fontWeight: '600',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#333',
    fontSize: 15,
    padding: 4,
  },

  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  iconButton: {
    padding: 4,
  },

  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },

  // Banner original.
  witcherBoardCard: {
    backgroundColor: '#002f5c',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  boardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  boardDescription: {
    fontSize: 13,
    color: '#e1f5fe',
    lineHeight: 20,
    marginBottom: 16,
  },
  boardButton: {
    flexDirection: 'row',
    backgroundColor: '#FFBA08',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  boardButtonText: {
    color: '#002f5c',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 6,
  },

  // Pestañas originales.
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#e4ebf1',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#005b9f',
  },

  // Tarjetas de servicio originales.
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceFolio: {
    fontSize: 12,
    color: '#888',
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  deviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  problemText: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  serviceFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    gap: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
});
