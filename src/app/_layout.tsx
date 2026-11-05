import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SessionProvider, useSession } from '@/auth/context';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function SessionRoutes() {
  const { status, message, retry, logout } = useSession();
  if (status === 'checking' || status === 'error') {
    return <View style={styles.wait}>
      {status === 'checking' ? <><ActivityIndicator color="#005b9f" /><Text style={styles.text}>Comprobando sesión…</Text></> : <>
        <Text style={styles.text}>{message}</Text>
        <TouchableOpacity style={styles.button} onPress={() => { void retry(); }}><Text style={styles.link}>Reintentar</Text></TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => { void logout(); }}><Text style={styles.link}>Cerrar sesión local</Text></TouchableOpacity>
      </>}
    </View>;
  }
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="index" />
    <Stack.Protected guard={status === 'anonymous'}><Stack.Screen name="login" /></Stack.Protected>
    <Stack.Protected guard={status === 'authenticated'}>
      <Stack.Screen name="tabs" />
      <Stack.Screen name="explore" />
    </Stack.Protected>
  </Stack>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
    <SessionProvider><SessionRoutes /></SessionProvider>
    <AnimatedSplashOverlay />
  </ThemeProvider>;
}
const styles = StyleSheet.create({
  wait: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 28, gap: 16 },
  text: { color: '#333', textAlign: 'center' },
  button: { padding: 12 },
  link: { color: '#005b9f', fontWeight: 'bold' },
});
