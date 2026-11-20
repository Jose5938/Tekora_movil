import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Availability } from '@/api/reservations';

const weekday = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function Schedule({ availability }: { availability: Availability }) {
  if (!availability.configured) return <Text style={reservationStyles.text}>El prestador aún no ha publicado un horario.</Text>;
  return <View style={reservationStyles.group}>
    <Text style={reservationStyles.text}>Zona horaria: {availability.timezone}</Text>
    {availability.intervals.map(interval => <Text
      key={`${interval.weekday}-${interval.start_local}-${interval.end_local}`} style={reservationStyles.text}>
      {weekday[interval.weekday]}: {interval.start_local}–{interval.end_local}
    </Text>)}
    {!!availability.blocked_dates.length && <Text style={reservationStyles.text}>Fechas bloqueadas: {availability.blocked_dates.join(', ')}</Text>}
    <Text style={reservationStyles.text}>El horario publicado es orientativo. Tekora verifica cada propuesta.</Text>
  </View>;
}

export function ReservationButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={[reservationStyles.button, disabled && reservationStyles.disabled]}>
    <Text style={reservationStyles.buttonText}>{label}</Text>
  </TouchableOpacity>;
}

export const reservationStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e5ecf3', gap: 10 },
  group: { gap: 6 },
  title: { color: '#1a1a1a', fontWeight: 'bold', fontSize: 17 },
  text: { color: '#555', lineHeight: 21 },
  badge: { color: '#005b9f', fontWeight: 'bold', backgroundColor: '#e1f5fe', padding: 8, borderRadius: 8 },
  error: { color: '#a32622' },
  button: { backgroundColor: '#005b9f', borderRadius: 12, alignItems: 'center', padding: 13 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  disabled: { opacity: 0.55 },
  input: { borderWidth: 1, borderColor: '#e5ecf3', borderRadius: 12, padding: 10, color: '#1a1a1a' },
});
