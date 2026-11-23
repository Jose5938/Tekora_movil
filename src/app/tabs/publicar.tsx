import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { ModuleScreen } from '@/components/module-screen';
import { ReservationButton, reservationStyles as ui } from '@/components/reservation-ui';

export default function PublishWorkScreen() {
  const router = useRouter();
  return <ModuleScreen title="Publicar trabajo">
    <View style={ui.card}>
      <Text style={ui.title}>Publicación aún no disponible</Text>
      <Text style={ui.text}>Puedes solicitar ayuda desde un servicio publicado y conversar con su prestador.</Text>
      <ReservationButton label="Buscar un servicio" onPress={() => router.push('/tabs/servicios')} />
      <ReservationButton label="Ver mis solicitudes"
        onPress={() => router.push({ pathname: '/tabs/servicios', params: { vista: 'historial' } })} />
    </View>
  </ModuleScreen>;
}
