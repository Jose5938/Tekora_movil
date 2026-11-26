
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { catalogPath } from '@/api/catalog';
import { isUnreadCount } from '@/api/communications';
import NavegacionPersonalizada from '@/components/navegacion-personalizada';
import { useSession } from '@/auth/context';
import { useApiResource } from '@/hooks/use-api-resource';
import { ApiState, Pagination } from '@/components/api-state';
import { isProviderCollection, type Provider } from '@/api/types';
import { useTekoraTheme } from '@/theme/tekora-theme';

// Colores originales y colores de Tekora Web.
const LIGHT = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  input: '#FFFFFF',
  text: '#1A1A1A',
  muted: '#666666',
  subtle: '#888888',
  primary: '#005B9F',
  cyan: '#008BB5',
  iconBg: '#F0F4F8',
  border: '#EEEEEE',
  banner: '#E1F5FE',
  bannerCircle: '#B3E5FC',
  bannerTitle: '#002F5C',
  bannerIcon: '#99D6EA',
  shortcut: '#E1F5FE',
  inactive: '#FFFFFF',
  activeText: '#FFFFFF',
  dangerBg: '#FFEEEE',
  danger: '#D9534F',
  badgeText: '#FFFFFF',
};

const DARK = {
  bg: '#030817',
  surface: '#07152A',
  input: '#07152A',
  text: '#EAFBFF',
  muted: '#A3B6CC',
  subtle: '#90A7BC',
  primary: '#00B4D8',
  cyan: '#90E0EF',
  iconBg: '#102B48',
  border: '#29425B',
  banner: '#102B48',
  bannerCircle: '#16496A',
  bannerTitle: '#EAFBFF',
  bannerIcon: '#4EA8C9',
  shortcut: '#123856',
  inactive: '#0B2039',
  activeText: '#031526',
  dangerBg: '#3A1B2A',
  danger: '#FF8A9A',
  badgeText: '#031526',
};

type Palette = typeof LIGHT;

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.bg,
    },
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 140,
    },

    // Cabecera
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    locationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    locationIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.iconBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    locationTextContainer: {
      marginLeft: 10,
      flexShrink: 1,
    },
    locationLabel: {
      fontSize: 10,
      color: c.subtle,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    locationSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    locationValue: {
      fontSize: 14,
      fontWeight: 'bold',
      color: c.text,
    },

    // Botones de la cabecera
    headerRightIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.iconBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoutButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.dangerBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    noticeBadge: {
      position: 'absolute',
      right: -4,
      top: -4,
      backgroundColor: c.primary,
      color: c.badgeText,
      paddingHorizontal: 4,
      borderRadius: 8,
      textAlign: 'center',
      fontSize: 10,
      fontWeight: 'bold',
      overflow: 'hidden',
    },

    // Barra de búsqueda
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.input,
      borderRadius: 12,
      paddingHorizontal: 15,
      paddingVertical: 12,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: c.border,
      elevation: 2,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      fontSize: 15,
      color: c.text,
    },

    // Banner original
    banner: {
      backgroundColor: c.banner,
      borderRadius: 20,
      padding: 24,
      flexDirection: 'row',
      marginBottom: 30,
      position: 'relative',
      overflow: 'hidden',
    },
    bannerContent: {
      flex: 1,
      zIndex: 2,
    },
    bannerLogoText: {
      color: c.cyan,
      fontWeight: '800',
      fontSize: 14,
      marginBottom: 8,
    },
    bannerGreeting: {
      color: c.cyan,
      fontSize: 12,
      marginBottom: 4,
    },
    bannerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: c.bannerTitle,
      marginBottom: 12,
      lineHeight: 30,
    },
    bannerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    bannerBadgeText: {
      color: c.primary,
      fontSize: 12,
      marginLeft: 4,
      fontWeight: '600',
    },
    bannerImagePlaceholder: {
      position: 'absolute',
      right: -20,
      bottom: -10,
      width: 140,
      height: 140,
      backgroundColor: c.bannerCircle,
      borderRadius: 70,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },

    // Accesos rápidos
    shortcuts: {
      marginHorizontal: 20,
      marginBottom: 16,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    shortcut: {
      flexGrow: 1,
      flexBasis: 120,
      minHeight: 44,
      padding: 10,
      borderRadius: 12,
      backgroundColor: c.shortcut,
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    shortcutText: {
      color: c.primary,
      fontWeight: '600',
      flexShrink: 1,
    },

    // Categorías
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: c.text,
      marginBottom: 16,
    },
    categoriesContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 32,
    },
    categoryItem: {
      alignItems: 'center',
      flex: 1,
    },
    categoryIconContainer: {
      width: 60,
      height: 60,
      borderRadius: 20,
      backgroundColor: c.inactive,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.border,
      elevation: 2,
    },
    categoryIconActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    categoryLabel: {
      fontSize: 12,
      color: c.text,
      fontWeight: '500',
      textAlign: 'center',
    },
    categoryLabelActive: {
      color: c.primary,
      fontWeight: 'bold',
    },

    // Expertos
    expertsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    seeAllText: {
      color: c.cyan,
      fontWeight: 'bold',
      fontSize: 14,
    },
    expertCard: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.border,
      elevation: 2,
    },
    expertAvatarPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.iconBg,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    expertInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    expertNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    expertName: {
      fontSize: 15,
      fontWeight: 'bold',
      color: c.text,
    },
    expertSubtitle: {
      fontSize: 13,
      color: c.muted,
      marginBottom: 4,
    },
    expertDetails: {
      fontSize: 12,
      color: c.subtle,
      fontWeight: '500',
    },
    expertPriceContainer: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
  });

// Reproducción del símbolo de Tekora, sin PNG.
function TekoraSymbol() {
  return (
    <View
      accessible
      accessibilityLabel="Logo de Tekora"
      style={{
        width: 28,
        height: 28,
        position: 'relative',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 2,
          top: 4,
          width: 16,
          height: 20,
          borderRadius: 3,
          backgroundColor: '#90E0EF',
          transform: [{ skewX: '-17deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 16,
          top: 9,
          width: 10,
          height: 16,
          borderRadius: 3,
          backgroundColor: '#0077B6',
          transform: [{ skewX: '-17deg' }],
        }}
      />
    </View>
  );
}

function CategoryItem({
  icon,
  label,
  isActive = false,
  onPress,
  c,
  styles,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  isActive?: boolean;
  onPress: () => void;
  c: Palette;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.categoryItem}
      onPress={onPress}
    >
      <View
        style={[
          styles.categoryIconContainer,
          isActive && styles.categoryIconActive,
        ]}
      >
        <Ionicons
          name={icon}
          size={28}
          color={isActive ? c.activeText : c.primary}
        />
      </View>
      <Text
        style={[
          styles.categoryLabel,
          isActive && styles.categoryLabelActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ExpertCard({
  provider,
  onPress,
  c,
  styles,
}: {
  provider: Provider;
  onPress: () => void;
  c: Palette;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity
      style={styles.expertCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.expertAvatarPlaceholder}>
        <Ionicons
          name="person"
          size={30}
          color={c.muted}
        />
      </View>

      <View style={styles.expertInfo}>
        <View style={styles.expertNameRow}>
          <Text style={styles.expertName}>
            {provider.display_name}
          </Text>
        </View>

        <Text style={styles.expertSubtitle}>
          {provider.headline ?? 'Presentación no publicada'}
        </Text>

        <Text
          style={styles.expertDetails}
          numberOfLines={2}
        >
          {provider.bio ?? 'Biografía no publicada'}
        </Text>
      </View>

      <View style={styles.expertPriceContainer}>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={c.primary}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useSession();

  // Estado local del tema. Inicialmente claro.
  const { darkMode, setDarkMode } = useTekoraTheme();
  const c = darkMode ? DARK : LIGHT;
  const styles = makeStyles(c);

  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Mantenemos las consultas originales.
  const notices = useApiResource(
    '/notifications/unread-count',
    isUnreadCount,
    true
  );

  useFocusEffect(notices.retry);

  const unread = notices.data?.data.unread_count;

  const providers = useApiResource(
    catalogPath('/providers', page, search),
    isProviderCollection
  );

  const cerrarSesion = async () => {
    if (closing) return;

    setClosing(true);

    try {
      await logout();
    } finally {
      setClosing(false);
    }
  };

  const buscarExpertos = () => {
    setSearch(query.trim());
    setPage(1);
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      
      <StatusBar
        barStyle={darkMode ? 'light-content' : 'dark-content'}
      />


      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cabecera */}
        <View style={styles.header}>
          <View style={styles.locationContainer}>
            <View style={styles.locationIconWrapper}>
              <TekoraSymbol />
            </View>

            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>
                TEKORA
              </Text>

              <View style={styles.locationSelector}>
                <Text
                  style={styles.locationValue}
                  numberOfLines={1}
                >
                  Catálogo público
                </Text>
              </View>
            </View>
          </View>

          {/* Acciones del encabezado */}
          <View style={styles.headerRightIcons}>
            {/* Nuevo botón claro / oscuro */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                darkMode
                  ? 'Activar modo claro'
                  : 'Activar modo oscuro'
              }
              accessibilityHint="Cambia los colores de la pantalla de inicio"
              style={styles.headerButton}
              onPress={() => setDarkMode(!darkMode)}
            >
              <Ionicons
                name={darkMode ? 'sunny-outline' : 'moon-outline'}
                size={21}
                color={c.primary}
              />
            </TouchableOpacity>

            {/* Notificaciones */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Notificaciones"
              accessibilityHint={
                unread === undefined
                  ? undefined
                  : `${unread} sin leer`
              }
              style={styles.headerButton}
              onPress={() =>
                router.push('/tabs/notificaciones')
              }
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={c.text}
              />

              {!!unread && (
                <Text style={styles.noticeBadge}>
                  {unread > 99 ? '99+' : unread}
                </Text>
              )}
            </TouchableOpacity>

            {/* Cerrar sesión */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              disabled={closing}
              style={styles.logoutButton}
              onPress={() => {
                void cerrarSesion();
              }}
            >
              <Ionicons
                name="log-out-outline"
                size={24}
                color={c.danger}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barra de búsqueda */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={c.subtle}
            style={styles.searchIcon}
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Buscar expertos (pulsa buscar)"
            placeholderTextColor={c.subtle}
            value={query}
            onChangeText={setQuery}
            maxLength={120}
            returnKeyType="search"
            onSubmitEditing={buscarExpertos}
          />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Buscar expertos"
            onPress={buscarExpertos}
          >
            <Ionicons
              name="arrow-forward"
              size={20}
              color={c.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerLogoText}>
              repara.
            </Text>

            <Text style={styles.bannerGreeting}>
              Hola, {user?.name}. Todo tiene solución.
            </Text>

            <Text style={styles.bannerTitle}>
              Tu hogar, en{'\n'}buenas manos.
            </Text>

            <View style={styles.bannerBadge}>
              <Ionicons
                name="people-outline"
                size={14}
                color={c.primary}
              />

              <Text style={styles.bannerBadgeText}>
                Conoce a los prestadores
              </Text>
            </View>
          </View>

          <View style={styles.bannerImagePlaceholder}>
            <Ionicons
              name="construct-outline"
              size={60}
              color={c.bannerIcon}
            />
          </View>
        </View>

        {/* Mis solicitudes y reservas */}
        <View style={styles.shortcuts}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Mis solicitudes"
            style={styles.shortcut}
            onPress={() =>
              router.push({
                pathname: '/tabs/servicios',
                params: { vista: 'historial' },
              })
            }
          >
            <Ionicons
              name="clipboard-outline"
              size={20}
              color={c.primary}
            />

            <Text style={styles.shortcutText}>
              Mis solicitudes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Mis reservas"
            style={styles.shortcut}
            onPress={() => router.push('/tabs/reserva')}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={c.primary}
            />

            <Text style={styles.shortcutText}>
              Mis reservas
            </Text>
          </TouchableOpacity>
        </View>

        {/* Categorías */}
        <Text style={styles.sectionTitle}>
          Explora Tekora
        </Text>

        <View style={styles.categoriesContainer}>
          <CategoryItem
            icon="build-outline"
            label="Servicios"
            isActive
            c={c}
            styles={styles}
            onPress={() =>
              router.push('/tabs/servicios')
            }
          />

          <CategoryItem
            icon="people-outline"
            label="Expertos"
            c={c}
            styles={styles}
            onPress={() =>
              router.push('/tabs/expertos')
            }
          />

          <CategoryItem
            icon="chatbubble-outline"
            label="Mensajes"
            c={c}
            styles={styles}
            onPress={() =>
              router.push('/tabs/chat')
            }
          />

          <CategoryItem
            icon="person-outline"
            label="Cuenta"
            c={c}
            styles={styles}
            onPress={() =>
              router.push('/tabs/cuenta')
            }
          />

          <CategoryItem
            icon="clipboard-outline"
            label="Publicar"
            c={c}
            styles={styles}
            onPress={() =>
              router.push('/tabs/publicar')
            }
          />
        </View>

        {/* Expertos publicados */}
        <View style={styles.expertsHeader}>
          <Text style={styles.sectionTitle}>
            Expertos publicados
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/tabs/expertos',
                params: { q: search },
              })
            }
          >
            <Text style={styles.seeAllText}>
              Ver todos
            </Text>
          </TouchableOpacity>
        </View>

        <ApiState
          {...providers}
          empty={providers.data?.data.length === 0}
        />

        {providers.data?.data.map((provider) => (
          <ExpertCard
            key={provider.id}
            provider={provider}
            c={c}
            styles={styles}
            onPress={() =>
              router.push({
                pathname: '/tabs/perfil-experto',
                params: { id: provider.id },
              })
            }
          />
        ))}

        <Pagination
          meta={providers.data?.meta}
          onPage={setPage}
        />
      </ScrollView>

      {/* Barra inferior con el mismo tema */}
      <NavegacionPersonalizada darkMode={darkMode} />
    </SafeAreaView>
  );
}
