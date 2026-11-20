import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PreparationNotice } from '@/components/preparation-notice';

export default function PagoPayPalScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#003087" />
        </TouchableOpacity>
        <Text style={styles.paypalLogo}>
          <Text style={{color: '#003087'}}>Pay</Text><Text style={{color: '#0079C1'}}>Pal</Text>
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.container}>
        <PreparationNotice>Los pagos están en preparación. Esta vista no conecta con PayPal, no realiza cobros y no confirma reservas.</PreparationNotice>
        <View style={styles.summaryContainer}>
          <Text style={styles.merchantName}>Tekora MX</Text>
          <Text style={styles.amount}>— <Text style={styles.currency}>MXN</Text></Text>
          <Text style={styles.description}>Sin reserva ni importe de pago</Text>
        </View>

        <View style={styles.accountCard}>
          <View style={styles.accountHeader}>
            <Text style={styles.accountTitle}>Método de pago en preparación</Text>
          </View>
          <View style={styles.paymentMethod}>
            <View style={styles.cardIcon}>
              <Ionicons name="card" size={20} color="#003087" />
            </View>
            <View style={styles.cardDetails}>
              <Text style={styles.cardName}>Sin método de pago asociado</Text>
              <Text style={styles.cardUser}>Sin cuenta de PayPal conectada</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>
        </View>

        <View style={styles.protectionNote}>
          <Ionicons name="shield-checkmark" size={16} color="#0079C1" />
          <Text style={styles.protectionText}>
            La integración de pagos <Text style={styles.protectionBold}>aún no está disponible</Text>.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity accessibilityRole="button" disabled accessibilityState={{ disabled: true }} style={[styles.payButton, { opacity: 0.5 }]}>
          <Text style={styles.payButtonText}>Pagos en preparación</Text>
        </TouchableOpacity>
        <Text style={styles.cancelText} onPress={() => router.back()}>
          Cancelar y volver a Tekora
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f7fa' },
  
  // Estilos de la pantalla de carga/éxito
  loadingScreen: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  centerContent: { alignItems: 'center', paddingHorizontal: 40 },
  loadingTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginTop: 32, marginBottom: 8 },
  loadingSub: { fontSize: 14, color: '#666', textAlign: 'center' },
  successIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50', marginTop: 32, marginBottom: 8, textAlign: 'center' },
  successSub: { fontSize: 15, color: '#666', textAlign: 'center' },

  // Estilos del Checkout de PayPal
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eaeaea' },
  paypalLogo: { fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 30 },
  summaryContainer: { alignItems: 'center', marginBottom: 40 },
  merchantName: { fontSize: 16, color: '#333', marginBottom: 8 },
  amount: { fontSize: 40, fontWeight: '300', color: '#1a1a1a', marginBottom: 8 },
  currency: { fontSize: 20, fontWeight: '400' },
  description: { fontSize: 14, color: '#666', marginBottom: 4 },
  accountCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eaeaea', overflow: 'hidden', marginBottom: 24 },
  accountHeader: { backgroundColor: '#f9f9f9', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eaeaea' },
  accountTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  cardIcon: { width: 40, height: 28, backgroundColor: '#f0f0f0', borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#ddd' },
  cardDetails: { flex: 1 },
  cardName: { fontSize: 15, color: '#1a1a1a', fontWeight: '500', marginBottom: 2 },
  cardUser: { fontSize: 13, color: '#666' },
  protectionNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  protectionText: { fontSize: 12, color: '#666', marginLeft: 8 },
  protectionBold: { color: '#0079C1', fontWeight: 'bold' },
  footer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, borderTopWidth: 1, borderTopColor: '#eaeaea' },
  payButton: { backgroundColor: '#FFC439', borderRadius: 24, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16, elevation: 1 },
  payButtonText: { color: '#003087', fontSize: 16, fontWeight: 'bold' },
  cancelText: { textAlign: 'center', color: '#0079C1', fontSize: 14, fontWeight: '600' },
});