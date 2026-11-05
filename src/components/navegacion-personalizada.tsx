import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NavegacionPersonalizada() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.navegacion, { paddingBottom: insets.bottom > 0 ? insets.bottom + 6 : 12 }]}>
       <TouchableOpacity style={styles.navItem} onPress={() => router.navigate('/tabs')}>
        <Ionicons name="home-outline" size={24} color={pathname === '/tabs' ? '#005b9f' : '#666'} />
        <Text style={[styles.navText, pathname === '/tabs' && styles.navTextActive]}>Inicio</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => router.navigate('/tabs/servicios')}>
        <Ionicons name="document-text-outline" size={24} color={pathname === '/tabs/servicios' ? '#005b9f' : '#666'} />
        <Text style={[styles.navText, pathname === '/tabs/servicios' && styles.navTextActive]}>Servicios</Text>
      </TouchableOpacity>

     <TouchableOpacity style={styles.navItem} onPress={() => router.navigate('/tabs/chat')}>
        <Ionicons name="chatbubble-outline" size={24} color={pathname === '/tabs/chat' ? '#005b9f' : '#666'} />
        <Text style={[styles.navText, pathname === '/tabs/chat' && styles.navTextActive]}>Mensajes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.navItem} onPress={() => router.navigate('/tabs/cuenta')}>
        <Ionicons name="person-outline" size={24} color={pathname.includes('cuenta') ? '#005b9f' : '#666'} />
        <Text style={[styles.navText, pathname.includes('cuenta') && styles.navTextActive]}>Mi cuenta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  navegacion: {
    paddingTop: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Fondo blanco sólido que cubre la parte inferior
    borderTopWidth: 1,
    borderTopColor: '#E5ECF3',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Sombra sutil para un efecto flotante elegante
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  navTextActive: {
    color: '#005b9f',
    fontWeight: 'bold',
  },
});