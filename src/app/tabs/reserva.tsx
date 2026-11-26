
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  isReservationCollection,
  reservationLabels,
} from '@/api/reservations';
import { resourceId } from '@/api/types';
import { ApiState, Pagination } from '@/components/api-state';
import { ReservationDetail } from '@/components/reservation-detail';
import { ReservationProposal } from '@/components/reservation-proposal';
import {
  ReservationButton,
  reservationStyles,
} from '@/components/reservation-ui';
import { useApiResource } from '@/hooks/use-api-resource';
import { useTekoraTheme } from '@/theme/tekora-theme';

export default function ReservaScreen() {
  const router = useRouter();
  const { colors } = useTekoraTheme();

  const params = useLocalSearchParams<{
    id?: string;
    inquiry?: string;
    vista?: string;
  }>();

  const id = resourceId(params.id);
  const inquiry = resourceId(params.inquiry);
  const completed = params.vista === 'historial';

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface },
        ]}
      >
        <TouchableOpacity
          accessibilityLabel="Volver"
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace('/tabs')
          }
          style={styles.iconButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            { color: colors.text },
          ]}
        >
          {id
            ? 'Tu reserva'
            : inquiry
              ? 'Propuesta de horario'
              : completed
                ? 'Historial de servicios'
                : 'Mis reservas'}
        </Text>

        <TouchableOpacity
          accessibilityLabel="Ir a inicio"
          onPress={() => router.replace('/tabs')}
          style={styles.iconButton}
        >
          <Ionicons
            name="close"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {id ? (
          <ReservationDetail key={id} id={id} />
        ) : inquiry ? (
          <ReservationProposal
            key={inquiry}
            inquiryId={inquiry}
          />
        ) : (
          <ReservationHistory
            key={completed ? 'completed' : 'all'}
            completed={completed}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReservationHistory({
  completed,
}: {
  completed: boolean;
}) {
  const router = useRouter();
  const { colors } = useTekoraTheme();
  const [page, setPage] = useState(1);

  const history = useApiResource(
    `/reservations?page=${page}${
      completed ? '&status=completed' : ''
    }`,
    isReservationCollection,
    true
  );

  return (
    <>
      <View style={styles.heroSection}>
        <Ionicons
          name="calendar"
          size={60}
          color={colors.primary}
        />

        <Text
          style={[
            styles.headerTitle,
            { color: colors.text },
          ]}
        >
          {completed
            ? 'Servicios completados'
            : 'Historial de reservas'}
        </Text>
      </View>

      <ApiState
        {...history}
        empty={history.data?.data.length === 0}
        emptyMessage={
          completed
            ? 'Todavía no tienes servicios completados.'
            : 'Todavía no tienes reservas.'
        }
      />

      {history.data?.data.map(item => (
        <TouchableOpacity
          key={item.id}
          accessibilityRole="button"
          style={[
            reservationStyles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() =>
            router.push({
              pathname: '/tabs/reserva',
              params: { id: item.id },
            })
          }
        >
          <Text
            style={[
              reservationStyles.title,
              { color: colors.text },
            ]}
          >
            Reserva #{item.id}
          </Text>

          <Text
            style={[
              reservationStyles.badge,
              {
                color: colors.primary,
                backgroundColor: colors.accent,
              },
            ]}
          >
            {reservationLabels[item.status]}
          </Text>

          <Text
            style={[
              reservationStyles.text,
              { color: colors.muted },
            ]}
          >
            {item.date} · {item.time}–{item.end_time}
            {' '}
            ({item.timezone})
          </Text>
        </TouchableOpacity>
      ))}

      <Pagination
        meta={history.data?.meta}
        onPage={setPage}
      />

      <ReservationButton
        label="Actualizar reservas"
        onPress={history.retry}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
    gap: 14,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
});
