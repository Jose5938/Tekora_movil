import { useState } from 'react';
import { Text, View } from 'react-native';
import { isPublicReviewPage } from '@/api/reviews';
import { useApiResource } from '@/hooks/use-api-resource';
import { ApiState, Pagination } from './api-state';
import { reservationStyles as styles } from './reservation-ui';

export function PublicReviews({ path }: { path: string }) {
  const [page, setPage] = useState(1);
  const result = useApiResource(`${path}?page=${page}`, isPublicReviewPage);
  const meta = result.data?.meta;
  return <View style={styles.group}>
    <Text accessibilityRole="header" style={styles.title}>Reseñas</Text>
    <ApiState {...result} empty={meta?.total === 0} emptyMessage="Todavía no hay reseñas públicas." />
    {meta?.average_rating != null && <Text style={styles.badge}>
      {meta.average_rating}/5 · {meta.total} {meta.total === 1 ? 'reseña' : 'reseñas'}
    </Text>}
    {result.data?.data.map((item, index) => <View key={`${page}-${index}`} style={styles.card}>
      <Text style={styles.title}>{item.rating}/5 · {item.service_title}</Text>
      <Text style={styles.text}>{item.month}</Text>
      {item.comment && <Text style={styles.text}>{item.comment}</Text>}
    </View>)}
    <Pagination meta={meta} onPage={setPage} />
  </View>;
}
