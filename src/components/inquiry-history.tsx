
import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  inquiryLabels,
  isInquiryCollection,
} from '@/api/inquiries';
import { useApiResource } from '@/hooks/use-api-resource';
import {
  ApiState,
  Pagination,
} from '@/components/api-state';

// Tema global de Tekora.
import { useTekoraTheme } from '@/theme/tekora-theme';

export function InquiryHistory() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  // Obtenemos los mismos colores que utiliza Servicios.
  const { colors } = useTekoraTheme();

  // Consulta original. No se modifica.
  const history = useApiResource(
    `/inquiries?page=${page}`,
    isInquiryCollection,
    true
  );

  const retry = history.retry;

  useFocusEffect(retry);

  // Actualización original.
  const refresh = useCallback(() => {
    setPage(1);
    retry();
  }, [retry]);

  return (
    <>
      {/* Encabezado del historial */}
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: colors.text },
          ]}
        >
          Mis solicitudes
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Actualizar historial"
          onPress={refresh}
          style={styles.refresh}
        >
          <Ionicons
            name="refresh-outline"
            size={22}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Estados originales */}
      <ApiState
        {...history}
        empty={history.data?.data.length === 0}
        emptyMessage="Todavía no tienes solicitudes."
      />

      {/* Tarjetas del historial */}
      {history.data?.data.map(inquiry => (
        <TouchableOpacity
          key={inquiry.id}
          accessibilityRole="button"
          accessibilityLabel={
            `Solicitud #${inquiry.id}: ` +
            `${inquiry.service_title}, ` +
            `${inquiryLabels[inquiry.status]}`
          }
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() =>
            router.push({
              pathname: '/tabs/solicitud',
              params: { id: inquiry.id },
            })
          }
        >
          {/* Folio y estado */}
          <View style={styles.row}>
            <Text
              style={[
                styles.folio,
                { color: colors.muted },
              ]}
            >
              Solicitud #{inquiry.id}
            </Text>

            <Text
              style={[
                styles.status,
                {
                  color: colors.primary,
                  backgroundColor: colors.accent,
                },
              ]}
            >
              {inquiryLabels[inquiry.status]}
            </Text>
          </View>

          {/* Nombre del servicio */}
          <Text
            style={[
              styles.title,
              { color: colors.text },
            ]}
          >
            {inquiry.service_title}
          </Text>

          {/* Descripción original */}
          <Text
            style={[
              styles.message,
              { color: colors.muted },
            ]}
            numberOfLines={2}
          >
            {inquiry.message}
          </Text>

          {/* Enlace al seguimiento */}
          <View style={styles.row}>
            <Text
              style={[
                styles.link,
                { color: colors.primary },
              ]}
            >
              Ver seguimiento
            </Text>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.primary}
            />
          </View>
        </TouchableOpacity>
      ))}

      {/* Paginación original */}
      <Pagination
        meta={history.data?.meta}
        onPage={setPage}
      />
    </>
  );
}

// Dimensiones originales conservadas.
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  refresh: {
    padding: 8,
  },

  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5ECF3',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },

  folio: {
    fontWeight: 'bold',
    color: '#555555',
  },

  status: {
    color: '#005B9F',
    backgroundColor: '#E1F5FE',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },

  message: {
    color: '#555555',
    lineHeight: 20,
  },

  link: {
    color: '#005B9F',
    fontWeight: '600',
  },
});
