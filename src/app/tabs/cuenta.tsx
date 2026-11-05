import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NavegacionPersonalizada from './navegador';

export default function MiCuentaScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      
      {/* Cabecera */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Tarjeta de Información del Usuario (Sin datos sensibles) */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color="#ccc" />
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Ana García</Text>
            {/* Insignia de seguridad en lugar de correo/teléfono */}
            <View style={styles.userBadge}>
               <Ionicons name="shield-checkmark" size={14} color="#005b9f" />
               <Text style={styles.userBadgeText}>Cuenta verificada</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.editProfileButton}>
            <Ionicons name="pencil" size={18} color="#005b9f" />
          </TouchableOpacity>
        </View>

        {/* Sección: Mi Actividad */}
        <Text style={styles.sectionTitle}>Mi actividad</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="calendar-outline" label="Mis solicitudes y citas" />
          <MenuItem icon="time-outline" label="Historial de servicios" />
          <MenuItem icon="heart-outline" label="Expertos favoritos" />
        </View>

        {/* Sección: Configuración de la cuenta */}
        <Text style={styles.sectionTitle}>Configuración</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="location-outline" label="Mis direcciones" />
          <MenuItem icon="card-outline" label="Métodos de pago" />
          <MenuItem icon="notifications-outline" label="Notificaciones" />
        </View>

        {/* Sección: Soporte */}
        <Text style={styles.sectionTitle}>Soporte</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="help-buoy-outline" label="Centro de ayuda" />
          <MenuItem icon="shield-checkmark-outline" label="Términos y privacidad" />
        </View>

        {/* Botón de Cerrar Sesión */}
        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={20} color="#d9534f" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

      </ScrollView>

      <NavegacionPersonalizada />
    </SafeAreaView>
  );
}

const MenuItem = ({ icon, label }: { icon: any, label: string }) => (
  <TouchableOpacity style={styles.menuItem}>
    <View style={styles.menuIconContainer}>
      <Ionicons name={icon} size={22} color="#005b9f" />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={20} color="#ccc" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  iconButton: { padding: 4 },
  
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },
  
  profileCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  avatarContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', position: 'relative', marginRight: 16 },
  editAvatarButton: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#005b9f', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  userInfo: { flex: 1, justifyContent: 'center' },
  userName: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 6 },
  userBadge: { flexDirection: 'row', alignItems: 'center' },
  userBadgeText: { fontSize: 13, color: '#005b9f', marginLeft: 4, fontWeight: '600' },
  editProfileButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f4f8', justifyContent: 'center', alignItems: 'center' },
  
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12, marginLeft: 4 },
  menuGroup: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 8, marginBottom: 24, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  menuIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f0f4f8', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: '#333', fontWeight: '500' },
  
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee', paddingVertical: 16, borderRadius: 16, marginTop: 8, marginBottom: 20 },
  logoutText: { fontSize: 15, fontWeight: 'bold', color: '#d9534f', marginLeft: 8 },
});