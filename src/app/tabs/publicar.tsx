import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PublicarSolicitudScreen() {
  const router = useRouter();
  const [categoriaSel, setCategoriaSel] = useState('');

  const categorias = [
    { id: 'refris', label: 'Refrigerador', icon: 'snow-outline' },
    { id: 'lavadoras', label: 'Lavadora', icon: 'water-outline' },
    { id: 'microondas', label: 'Microondas', icon: 'hardware-chip-outline' },
    { id: 'plomeria', label: 'Plomería', icon: 'build-outline' },
    { id: 'otros', label: 'Otros', icon: 'ellipsis-horizontal-circle-outline' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="close" size={26} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nuevo Trabajo</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.pageDescription}>
            Describe el problema detalladamente. Mientras más información des, mejores cotizaciones recibirás de los expertos.
          </Text>

          <Text style={styles.sectionLabel}>¿Qué equipo presenta la falla?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            {categorias.map((cat) => (
              <TouchableOpacity 
                key={cat.id}
                style={[styles.categoryChip, categoriaSel === cat.id && styles.categoryChipActive]}
                onPress={() => setCategoriaSel(cat.id)}
              >
                <Ionicons 
                  name={cat.icon as any} 
                  size={18} 
                  color={categoriaSel === cat.id ? '#fff' : '#005b9f'} 
                  style={{ marginRight: 6 }} 
                />
                <Text style={[styles.categoryText, categoriaSel === cat.id && styles.categoryTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionLabel}>Título corto de la falla</Text>
          <TextInput 
            style={styles.input}
            placeholder="Ej. Mi lavadora Whirlpool no exprime"
            placeholderTextColor="#999"
          />

          <Text style={styles.sectionLabel}>Descripción detallada</Text>
          <TextInput 
            style={[styles.input, styles.textArea]}
            placeholder="Menciona la marca, modelo si lo sabes, y los síntomas exactos del problema..."
            placeholderTextColor="#999"
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.sectionLabel}>Fotos o evidencia (Opcional)</Text>
          <TouchableOpacity style={styles.uploadBox}>
            <Ionicons name="camera-outline" size={32} color="#005b9f" style={{ marginBottom: 8 }} />
            <Text style={styles.uploadText}>Toma una foto o sube desde la galería</Text>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Ubicación del servicio</Text>
          <TouchableOpacity style={styles.locationSelector}>
            <Ionicons name="location" size={20} color="#005b9f" />
            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>Roma Norte, CDMX</Text>
              <Text style={styles.locationSubtitle}>Colima 145, Int. 4</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.submitButton} onPress={() => router.back()}>
            <Text style={styles.submitButtonText}>Publicar en el Tablero</Text>
            <Ionicons name="checkmark-circle-outline" size={20} color="#002f5c" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  iconButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  pageDescription: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 24 },
  sectionLabel: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12, marginTop: 10 },
  categoriesScroll: { flexDirection: 'row', marginBottom: 24 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4f8', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#e4ebf1' },
  categoryChipActive: { backgroundColor: '#005b9f', borderColor: '#005b9f' },
  categoryText: { fontSize: 14, color: '#005b9f', fontWeight: '500' },
  categoryTextActive: { color: '#fff' },
  input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e4ebf1', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#333', marginBottom: 20 },
  textArea: { minHeight: 120 },
  uploadBox: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#b3e5fc', borderRadius: 16, backgroundColor: '#f0f8ff', padding: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  uploadText: { fontSize: 13, color: '#005b9f', fontWeight: '500' },
  locationSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e4ebf1', borderRadius: 12, padding: 16, marginBottom: 20 },
  locationInfo: { flex: 1, marginLeft: 12 },
  locationTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  locationSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  submitButton: { flexDirection: 'row', backgroundColor: '#FFBA08', borderRadius: 14, paddingVertical: 16, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  submitButtonText: { color: '#002f5c', fontSize: 16, fontWeight: 'bold' },
});