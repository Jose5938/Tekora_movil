
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { catalogPath } from '@/api/catalog';
import { isProviderCollection } from '@/api/types';
import { ApiState, Pagination } from '@/components/api-state';
import { ModuleScreen } from '@/components/module-screen';
import { reservationStyles as ui } from '@/components/reservation-ui';
import { useApiResource } from '@/hooks/use-api-resource';

// Tema compartido con Inicio y Notificaciones.
import { useTekoraTheme } from '@/theme/tekora-theme';

export default function ExpertosScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{ q?: string }>();

  const initial =
    typeof params.q === 'string'
      ? params.q.trim().slice(0, 120)
      : '';

  const [name, setName] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [page, setPage] = useState(1);

  const providers = useApiResource(
    catalogPath('/providers', page, query),
    isProviderCollection
  );

  // Mantenemos la búsqueda original.
  function search() {
    if (name.trim() === query && page === 1) {
      providers.retry();
    } else {
      setQuery(name.trim());
      setPage(1);
    }
  }

  // Únicamente colores dinámicos.
  const { colors } = useTekoraTheme();

  return (
    <ModuleScreen
      title="Expertos"
      keyboard
      themeColors={colors}
    >
      {/* Buscador original */}
      <View
        style={[
          ui.card,
          styles.search,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <TextInput
          style={[
            ui.input,
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          accessibilityLabel="Nombre del experto"
          placeholder="Busca por nombre"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
          maxLength={120}
          returnKeyType="search"
          onSubmitEditing={search}
        />

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Buscar expertos"
          style={styles.button}
          onPress={search}
        >
          <Ionicons
            name="search-outline"
            size={23}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Estados de carga y resultados originales */}
      <ApiState
        {...providers}
        empty={providers.data?.data.length === 0}
        emptyMessage="No se encontraron expertos publicados."
      />

      {/* Tarjetas de expertos */}
      {providers.data?.data.map(provider => (
        <TouchableOpacity
          key={provider.id}
          accessibilityRole="button"
          style={[
            ui.card,
            styles.row,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() =>
            router.push({
              pathname: '/tabs/perfil-experto',
              params: { id: provider.id },
            })
          }
        >
          <Ionicons
            name="person-circle-outline"
            size={42}
            color={colors.primary}
          />

          <View style={styles.info}>
            <Text
              style={[
                ui.title,
                { color: colors.text },
              ]}
            >
              {provider.display_name}
            </Text>

            {provider.headline && (
              <Text
                style={[
                  ui.text,
                  { color: colors.muted },
                ]}
              >
                {provider.headline}
              </Text>
            )}

            {provider.bio && (
              <Text
                style={[
                  ui.text,
                  { color: colors.muted },
                ]}
                numberOfLines={2}
              >
                {provider.bio}
              </Text>
            )}
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>
      ))}

      {/* Paginación original */}
      <Pagination
        meta={providers.data?.meta}
        onPage={setPage}
      />
    </ModuleScreen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    minWidth: 0,
  },

  button: {
    padding: 10,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  info: {
    flex: 1,
    minWidth: 0,
  },
});
