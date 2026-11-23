import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Text, View } from 'react-native';
import { ModuleScreen } from '@/components/module-screen';
import { ReservationButton, reservationStyles as ui } from '@/components/reservation-ui';

const topics: Record<string, { title: string; text: string; link?: { label: string; href: Href } }> = {
  ayuda: {
    title: 'Centro de ayuda',
    text: 'Consulta tu solicitud para ver su estado, conversar con el prestador y revisar la cotización o la reserva asociada.',
    link: { label: 'Abrir Mis solicitudes', href: { pathname: '/tabs/servicios', params: { vista: 'historial' } } },
  },
  favoritos: {
    title: 'Expertos favoritos', text: 'Guardar favoritos aún no está disponible en esta versión.',
    link: { label: 'Buscar expertos', href: '/tabs/expertos' },
  },
  direcciones: { title: 'Mis direcciones', text: 'La app aún no guarda una libreta de direcciones.' },
  pagos: { title: 'Métodos de pago', text: 'Tekora Móvil no guarda tarjetas. El checkout de prueba solo opera en un laboratorio local y no realiza cobros.' },
  privacidad: {
    title: 'Términos y privacidad',
    text: 'Tu foto de perfil se consulta desde tu sesión. Para proteger tu privacidad, las solicitudes y los mensajes rechazan teléfonos, correos y enlaces de contacto. Esta versión aún no incluye un enlace al documento de términos.',
  },
  preferencias: { title: 'Preferencias', text: 'Esta versión aún no guarda preferencias de cuenta en el servidor.' },
};

export default function HelpScreen() {
  const router = useRouter();
  const { tema } = useLocalSearchParams<{ tema?: string }>();
  const topic = tema && Object.hasOwn(topics, tema) ? topics[tema] : topics.ayuda;
  const link = topic.link;
  return <ModuleScreen title={topic.title}>
    <View style={ui.card}>
      <Text style={ui.text}>{topic.text}</Text>
      {link && <ReservationButton label={link.label} onPress={() => router.push(link.href)} />}
    </View>
  </ModuleScreen>;
}
