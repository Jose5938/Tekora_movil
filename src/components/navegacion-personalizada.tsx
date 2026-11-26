
import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  darkMode?: boolean;
};

export default function NavegacionPersonalizada({
  darkMode = false,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const colors = darkMode
    ? {
        background: '#07152A',
        border: '#29425B',
        active: '#90E0EF',
        inactive: '#A3B6CC',
      }
    : {
        background: '#FFFFFF',
        border: '#E5ECF3',
        active: '#005B9F',
        inactive: '#666666',
      };

  const active = {
    home: pathname === '/tabs',
    services: [
      '/tabs/servicios',
      '/tabs/solicitud',
      '/tabs/detalle-servicio',
      '/tabs/reserva',
    ].includes(pathname),
    messages: pathname === '/tabs/chat',
    account: pathname === '/tabs/cuenta',
  };

  const tabs = [
    {
      label: 'Inicio',
      icon: 'home-outline' as const,
      selected: active.home,
      route: '/tabs' as const,
    },
    {
      label: 'Servicios',
      icon: 'document-text-outline' as const,
      selected: active.services,
      route: '/tabs/servicios' as const,
    },
    {
      label: 'Mensajes',
      icon: 'chatbubble-outline' as const,
      selected: active.messages,
      route: '/tabs/chat' as const,
    },
    {
      label: 'Mi cuenta',
      icon: 'person-outline' as const,
      selected: active.account,
      route: '/tabs/cuenta' as const,
    },
  ];

  return (
    <View
      style={[
        styles.navegacion,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom:
            insets.bottom > 0
              ? insets.bottom + 6
              : 12,
        },
      ]}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.route}
          accessibilityRole="tab"
          accessibilityLabel={tab.label}
          accessibilityState={{
            selected: tab.selected,
          }}
          style={styles.navItem}
          onPress={() =>
            router.navigate(tab.route)
          }
        >
          <Ionicons
            name={tab.icon}
            size={24}
            color={
              tab.selected
                ? colors.active
                : colors.inactive
            }
          />

          <Text
            style={[
              styles.navText,
              {
                color: tab.selected
                  ? colors.active
                  : colors.inactive,
                fontWeight: tab.selected
                  ? 'bold'
                  : 'normal',
              },
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
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
    borderTopWidth: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },

  navItem: {
    alignItems: 'center',
    flex: 1,
  },

  navText: {
    fontSize: 11,
    marginTop: 4,
  },
});
