import { useState } from 'react';
import { Text, View } from 'react-native';

import { isPublicReviewPage } from '@/api/reviews';
import { useApiResource } from '@/hooks/use-api-resource';
import { ApiState, Pagination } from './api-state';
import { reservationStyles as styles } from './reservation-ui';

type ThemeColors = {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  accent: string;
};

export function PublicReviews({
  path,
  themeColors,
}: {
  path: string;
  themeColors?: ThemeColors;
}) {
  const [page, setPage] = useState(1);

  // Consulta original.
  const result = useApiResource(
    `${path}?page=${page}`,
    isPublicReviewPage
  );

  const meta = result.data?.meta;

  return (
    <View style={styles.group}>
      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          themeColors && {
            color: themeColors.text,
          },
        ]}
      >
        Reseñas
      </Text>

      <ApiState
        {...result}
        empty={meta?.total === 0}
        emptyMessage="Todavía no hay reseñas públicas."
      />

      {meta?.average_rating != null && (
        <Text
          style={[
            styles.badge,
            themeColors && {
              color: themeColors.primary,
              backgroundColor: themeColors.accent,
            },
          ]}
        >
          {meta.average_rating}/5
          {' · '}
          {meta.total}
          {' '}
          {meta.total === 1 ? 'reseña' : 'reseñas'}
        </Text>
      )}

      {result.data?.data.map((item, index) => (
        <View
          key={`${page}-${index}`}
          style={[
            styles.card,
            themeColors && {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              themeColors && {
                color: themeColors.text,
              },
            ]}
          >
            {item.rating}/5
            {' · '}
            {item.service_title}
          </Text>

          <Text
            style={[
              styles.text,
              themeColors && {
                color: themeColors.muted,
              },
            ]}
          >
            {item.month}
          </Text>

          {item.comment && (
            <Text
              style={[
                styles.text,
                themeColors && {
                  color: themeColors.muted,
                },
              ]}
            >
              {item.comment}
            </Text>
          )}
        </View>
      ))}

      <Pagination
        meta={meta}
        onPage={setPage}
      />
    </View>
  );
}
