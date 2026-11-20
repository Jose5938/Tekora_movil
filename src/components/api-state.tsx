import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { errorMessage } from '@/api/http';
import type { Page } from '@/api/types';

export function ApiState({ loading, error, empty, retry }: { loading: boolean; error: unknown; empty?: boolean; retry: () => void }) {
  if (!loading && !error && !empty) return null;
  return <View style={styles.box} accessibilityLiveRegion="polite">
    {loading ? <><ActivityIndicator color="#005b9f" /><Text style={styles.text}>Cargando…</Text></> : <>
      <Text style={styles.text}>{error ? errorMessage(error) : 'No hay resultados publicados para esta búsqueda.'}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={retry} style={styles.button}><Text style={styles.link}>Reintentar</Text></TouchableOpacity>
    </>}
  </View>;
}

export function Pagination({ meta, onPage }: { meta: Page | undefined; onPage: (page: number) => void }) {
  if (!meta || meta.last_page <= 1) return null;
  return <View style={styles.pagination}>
    <TouchableOpacity accessibilityRole="button" disabled={meta.current_page <= 1} onPress={() => onPage(meta.current_page - 1)}>
      <Text style={[styles.link, meta.current_page <= 1 && styles.disabled]}>Anterior</Text>
    </TouchableOpacity>
    <Text style={styles.text}>{meta.current_page} / {meta.last_page}</Text>
    <TouchableOpacity accessibilityRole="button" disabled={meta.current_page >= meta.last_page} onPress={() => onPage(meta.current_page + 1)}>
      <Text style={[styles.link, meta.current_page >= meta.last_page && styles.disabled]}>Siguiente</Text>
    </TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  box: { padding: 20, gap: 12, alignItems: 'center' },
  text: { color: '#555', fontSize: 14, textAlign: 'center' },
  link: { color: '#005b9f', fontWeight: '600' },
  button: { padding: 12 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  disabled: { opacity: 0.35 },
});
