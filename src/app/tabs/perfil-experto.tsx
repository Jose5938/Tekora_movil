
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  isProviderResource,
  isServiceCollection,
  modalityLabels,
  resourceId,
} from '@/api/types';

import { ApiState, Pagination } from '@/components/api-state';
import { ModuleScreen } from '@/components/module-screen';
import { PublicReviews } from '@/components/public-reviews';
import { reservationStyles as ui } from '@/components/reservation-ui';
import { useApiResource } from '@/hooks/use-api-resource';

import { useTekoraTheme } from '@/theme/tekora-theme';

export default function PerfilExpertoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const providerId = resourceId(id);

  // Compartimos el tema con las otras pantallas.
  const { colors } = useTekoraTheme();

  return (
    <ModuleScreen
      title="Perfil del experto"
      themeColors={colors}
    >
      {providerId ? (
        <ProviderContent key={providerId} id={providerId} />
      ) : (
        <Text
          style={[
            ui.error,
            { color: colors.error },
          ]}
        >
          Selecciona un experto del catálogo.
        </Text>
      )}
    </ModuleScreen>
  );
}

function ProviderContent({ id }: { id: number }) {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { colors } = useTekoraTheme();

  // Consulta original del perfil.
  const resource = useApiResource(
    `/providers/${id}`,
    isProviderResource
  );

  const provider = resource.data?.data;

  // Consulta original de servicios publicados.
  const services = useApiResource(
    provider
      ? `/providers/${id}/services?page=${page}`
      : null,
    isServiceCollection
  );

  return (
    <>
      <ApiState {...resource} />

      {provider && (
        <>
          {/* Tarjeta principal del experto */}
          <View
            style={[
              ui.card,
              styles.profile,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name="person"
                size={38}
                color={colors.primary}
              />
            </View>

            <Text
              style={[
                styles.name,
                { color: colors.text },
              ]}
            >
              {provider.display_name}
            </Text>

            {provider.headline && (
              <Text
                style={[
                  ui.badge,
                  {
                    color: colors.primary,
                    backgroundColor: colors.accent,
                  },
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
              >
                {provider.bio}
              </Text>
            )}
          </View>

          {/* Servicios publicados */}
          <Text
            accessibilityRole="header"
            style={[
              ui.title,
              { color: colors.text },
            ]}
          >
            Servicios publicados
          </Text>

          <ApiState
            {...services}
            empty={services.data?.data.length === 0}
            emptyMessage="Este experto no tiene servicios para mostrar."
          />

          {services.data?.data.map(service => (
            <TouchableOpacity
              key={service.id}
              accessibilityRole="button"
              style={[
                ui.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() =>
                router.push({
                  pathname: '/tabs/detalle-servicio',
                  params: { id: service.id },
                })
              }
            >
              <Text
                style={[
                  ui.title,
                  { color: colors.text },
                ]}
              >
                {service.title}
              </Text>

              <Text
                style={[
                  ui.text,
                  { color: colors.muted },
                ]}
              >
                {service.category.name}
                {' · '}
                {modalityLabels[service.modality]}
              </Text>

              <Text
                style={[
                  ui.text,
                  { color: colors.muted },
                ]}
                numberOfLines={3}
              >
                {service.description}
              </Text>

              <Text
                style={[
                  ui.badge,
                  {
                    color: colors.primary,
                    backgroundColor: colors.accent,
                  },
                ]}
              >
                Ver detalle y solicitar
              </Text>
            </TouchableOpacity>
          ))}

          <Pagination
            meta={services.data?.meta}
            onPage={setPage}
          />

          {/* Reseñas originales */}
          <PublicReviews
            path={`/providers/${id}/reviews`}
            themeColors={colors}
          />
        </>
      )}
    </>
  );
}

// Conservamos los tamaños y la distribución original.
const styles = StyleSheet.create({
  profile: {
    alignItems: 'center',
    paddingVertical: 24,
  },

  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#edf5fa',
  },

  name: {
    fontWeight: 'bold',
    color: '#1a1a1a',
    fontSize: 22,
    textAlign: 'center',
  },
});
