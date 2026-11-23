import type { PropsWithChildren, ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ModuleScreen({ title, keyboard = false, action, fallback = '/tabs', children }: PropsWithChildren<{
  title: string; keyboard?: boolean; action?: ReactNode; fallback?: '/tabs' | '/login';
}>) {
  const router = useRouter();
  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver" style={styles.back}
        onPress={() => router.canGoBack() ? router.back() : router.replace(fallback)}>
        <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
      </TouchableOpacity>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {action}
    </View>
    <KeyboardAvoidingView style={styles.body} behavior={keyboard && Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  back: { padding: 7 },
  title: { flex: 1, color: '#1a1a1a', fontSize: 20, fontWeight: 'bold' },
  body: { flex: 1 },
  content: { padding: 20, paddingBottom: 36, gap: 14, width: '100%', maxWidth: 720, alignSelf: 'center' },
});
