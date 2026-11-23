import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { isProviderResource, isServiceCollection, modalityLabels, resourceId } from '@/api/types';
import { ApiState, Pagination } from '@/components/api-state';
import { ModuleScreen } from '@/components/module-screen';
import { PublicReviews } from '@/components/public-reviews';
import { reservationStyles as ui } from '@/components/reservation-ui';
import { useApiResource } from '@/hooks/use-api-resource';

export default function PerfilExpertoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const providerId = resourceId(id);
  return <ModuleScreen title="Perfil del experto">
    {providerId ? <ProviderContent key={providerId} id={providerId} /> : <Text style={ui.error}>Selecciona un experto del catálogo.</Text>}
  </ModuleScreen>;
}

function ProviderContent({ id }: { id: number }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const resource = useApiResource(`/providers/${id}`, isProviderResource);
  const provider = resource.data?.data;
  const services = useApiResource(provider ? `/providers/${id}/services?page=${page}` : null, isServiceCollection);

  return <>
    <ApiState {...resource} />
    {provider && <>
      <View style={[ui.card, styles.profile]}>
        <View style={styles.avatar}><Ionicons name="person" size={38} color="#9ab8cc" /></View>
        <Text style={styles.name}>{provider.display_name}</Text>
        {provider.headline && <Text style={ui.badge}>{provider.headline}</Text>}
        {provider.bio && <Text style={ui.text}>{provider.bio}</Text>}
      </View>
      <Text accessibilityRole="header" style={ui.title}>Servicios publicados</Text>
      <ApiState {...services} empty={services.data?.data.length === 0} emptyMessage="Este experto no tiene servicios para mostrar." />
      {services.data?.data.map(service => <TouchableOpacity key={service.id} accessibilityRole="button"
        style={ui.card} onPress={() => router.push({ pathname: '/tabs/detalle-servicio', params: { id: service.id } })}>
        <Text style={ui.title}>{service.title}</Text>
        <Text style={ui.text}>{service.category.name} · {modalityLabels[service.modality]}</Text>
        <Text style={ui.text} numberOfLines={3}>{service.description}</Text>
        <Text style={ui.badge}>Ver detalle y solicitar</Text>
      </TouchableOpacity>)}
      <Pagination meta={services.data?.meta} onPage={setPage} />
      <PublicReviews path={`/providers/${id}/reviews`} />
    </>}
  </>;
}
const styles = StyleSheet.create({
  profile: { alignItems: 'center', paddingVertical: 24 },
  avatar: { alignItems: 'center', justifyContent: 'center', width: 76, height: 76, borderRadius: 38, backgroundColor: '#edf5fa' },
  name: { fontWeight: 'bold', color: '#1a1a1a', fontSize: 22, textAlign: 'center' },
});
