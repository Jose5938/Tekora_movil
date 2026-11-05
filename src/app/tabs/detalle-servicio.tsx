import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function DetalleServicioScreen() {
  const router = useRouter();

  // Datos simulados del servicio publicado
  const servicio = {
    folio: 'RP-1248',
    titulo: 'Mi lavadora Whirlpool no exprime', 
    etiqueta: 'Refrigerador', 
    descripcion: 'El congelador funciona perfecto, pero la parte de abajo de mi refri Mabe dejó de enfriar desde ayer en la noche.',
    estado: 'Buscando expertos',
    ubicacion: 'Roma Norte, CDMX',
    fecha: 'Publicado hoy, 09:30 a.m.'
  };

  // Técnicos sugeridos (filtrados por la etiqueta del problema)
  const expertosSugeridos = [
    { id: 1, nombre: 'Carlos Mendoza', especialidad: 'Refrigeradores', exp: '8 años', rating: '4.9', precio: '$350' },
    { id: 2, nombre: 'Roberto Gómez', especialidad: 'Refrigeración Industrial', exp: '12 años', rating: '4.8', precio: '$400' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Cabecera */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Solicitud</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Tarjeta de Especificaciones del Problema */}
        <View style={styles.specsCard}>
          <View style={styles.specsHeader}>
            <Text style={styles.folioText}>Folio: {servicio.folio}</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{servicio.estado}</Text>
            </View>
          </View>

          <View style={styles.tagContainer}>
            <Ionicons name="snow-outline" size={16} color="#005b9f" />
            <Text style={styles.tagText}>{servicio.etiqueta}</Text>
          </View>

          <Text style={styles.problemTitle}>{servicio.titulo}</Text>
          <Text style={styles.problemDescription}>"{servicio.descripcion}"</Text>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#666" />
            <Text style={styles.infoText}>{servicio.ubicacion}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color="#666" />
            <Text style={styles.infoText}>{servicio.fecha}</Text>
          </View>
        </View>

        {/* Sección de Técnicos Sugeridos */}
        <View style={styles.suggestedHeader}>
          <View>
            <Text style={styles.sectionTitle}>Técnicos Sugeridos</Text>
            <Text style={styles.sectionSubtitle}>Basado en tu etiqueta de "{servicio.etiqueta}"</Text>
          </View>
          <Ionicons name="sparkles" size={24} color="#FFBA08" />
        </View>

        {expertosSugeridos.map((experto) => (
          <View key={experto.id} style={styles.expertCard}>
            <View style={styles.expertAvatarPlaceholder}>
              <Ionicons name="person" size={28} color="#ccc" />
            </View>
            <View style={styles.expertInfo}>
              <View style={styles.expertNameRow}>
                <Text style={styles.expertName}>{experto.nombre}</Text>
                <Ionicons name="checkmark-circle" size={14} color="#005b9f" style={{marginLeft: 4}} />
              </View>
              <Text style={styles.expertSubtitle}>{experto.especialidad} · {experto.exp}</Text>
              <Text style={styles.expertDetails}>
                <Ionicons name="star" size={12} color="#005b9f" /> {experto.rating}
              </Text>
            </View>
            <View style={styles.expertActionContainer}>
              <Text style={styles.expertPrice}>{experto.precio}</Text>
              
              {/* Botón modificado con redirección y mensaje automático */}
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => {
                  const primerNombre = experto.nombre.split(' ')[0];
                  router.push({
                    pathname: '/tabs/chat',
                    params: { autoMsg: `Hola ${primerNombre}. Me gustaría solicitar tus servicios para mi ${servicio.etiqueta}: "${servicio.titulo}" (Folio: ${servicio.folio}). ¿Podrías darme una cotización?` }
                  });
                }}
              >
                <Text style={styles.contactButtonText}>Contactar</Text>
              </TouchableOpacity>

            </View>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff' },
  iconButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  
  specsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 30, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, borderWidth: 1, borderColor: '#eee' },
  specsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  folioText: { fontSize: 13, color: '#888', fontWeight: 'bold' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFBA0820', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFBA08', marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#b38200' },
  
  tagContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e1f5fe', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 12 },
  tagText: { color: '#005b9f', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  
  problemTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  problemDescription: { fontSize: 15, color: '#555', fontStyle: 'italic', lineHeight: 22, marginBottom: 16 },
  
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoText: { fontSize: 14, color: '#666', marginLeft: 10 },
  
  suggestedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  sectionSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  
  expertCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee', elevation: 1 },
  expertAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  expertInfo: { flex: 1, justifyContent: 'center' },
  expertNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  expertName: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  expertSubtitle: { fontSize: 12, color: '#666', marginBottom: 4 },
  expertDetails: { fontSize: 12, color: '#888', fontWeight: '500' },
  expertActionContainer: { alignItems: 'flex-end', justifyContent: 'space-between' },
  expertPrice: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  contactButton: { backgroundColor: '#005b9f', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginTop: 8 },
  contactButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});