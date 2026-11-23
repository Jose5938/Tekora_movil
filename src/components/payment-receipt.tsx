import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mxn } from '@/api/quotes';
import { quotePaymentView, type DemoCheckout } from '@/api/demo-checkout';

/** An internal demonstration receipt, never a bank or fiscal document. */
export function PaymentReceipt({ quoteId, checkout }: {
  quoteId: string; checkout: DemoCheckout | null;
}) {
  const [open, setOpen] = useState(false);
  const badge = quotePaymentView(quoteId, checkout);
  if (!checkout || !badge || !checkout.selection_verified || !checkout.reference ||
    !checkout.attempted_at || !checkout.amount ||
    !['test_approved', 'awaiting_cash', 'cash_received'].includes(checkout.status)) return null;

  const cancelled = checkout.reservation_status === 'cancelled';
  const cashPending = checkout.method === 'cash' && checkout.status === 'awaiting_cash';
  const date = new Date(checkout.attempted_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

  return <View style={styles.wrap}>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open }}
      style={styles.trigger} onPress={() => setOpen(value => !value)}>
      <Ionicons name="receipt-outline" color="#005b9f" size={20} />
      <Text style={styles.triggerText}>{open ? 'Ocultar' : 'Ver'} comprobante interno de prueba</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} color="#005b9f" size={19} />
    </TouchableOpacity>
    {open && <View style={styles.receipt}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>TEKORA · OPERACIÓN FICTICIA</Text>
        <Text style={styles.title}>Comprobante de demostración</Text>
        <Text style={styles.status}>{badge.label}</Text>
      </View>
      <Text style={styles.total}>{mxn(checkout.amount.total_cents)}</Text>
      <View style={styles.line} />
      <ReceiptRow title="Reserva" detail={'#' + checkout.reservation_id} />
      <ReceiptRow title="Método" detail={checkout.method === 'card' ? 'Tarjeta ficticia' : 'Efectivo'} />
      <ReceiptRow title="Fecha del intento" detail={date} />
      <ReceiptRow title="Referencia de prueba" detail={checkout.reference} />
      <ReceiptRow title="Comisión Tekora incluida" detail={mxn(checkout.amount.commission_cents)} />
      <ReceiptRow title="Importe del prestador" detail={mxn(checkout.amount.provider_cents)} />
      {!!checkout.received_at && <ReceiptRow title="Recepción ficticia" detail={
        new Date(checkout.received_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })} />}
      {cashPending && <Text style={styles.warning}>Efectivo pendiente de recepción; seleccionar este método no equivale a pagar.</Text>}
      {cancelled && <Text style={styles.warning}>Reserva cancelada. Se conserva el resultado de prueba histórico; no se ha registrado ningún reembolso.</Text>}
      <View style={styles.footer}>
        <Ionicons name="shield-checkmark-outline" color="#617887" size={17} />
        <Text style={styles.disclaimer}>Solo demostración local. No es comprobante bancario ni fiscal;
          no se movió dinero real.</Text>
      </View>
    </View>}
  </View>;
}

function ReceiptRow({ title, detail }: { title: string; detail: string }) {
  return <View style={styles.row}>
    <Text style={styles.label}>{title}</Text>
    <Text selectable style={styles.detail}>{detail}</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 9, marginTop: 6 },
  trigger: { flexDirection: 'row', alignItems: 'center', padding: 11, borderRadius: 12,
    borderColor: '#bcd9e9', borderWidth: 1, backgroundColor: '#edf7fc', gap: 9 },
  triggerText: { flex: 1, color: '#005b9f', fontSize: 13, fontWeight: '800' },
  receipt: { gap: 12, padding: 16, borderRadius: 16, backgroundColor: '#fff', borderColor: '#dce8ef', borderWidth: 1 },
  header: { gap: 4 },
  eyebrow: { color: '#005b9f', fontSize: 10, letterSpacing: 1.1, fontWeight: '800' },
  title: { color: '#002f5c', fontSize: 17, fontWeight: '800' },
  status: { color: '#176844', fontSize: 13, fontWeight: '700' },
  total: { color: '#002f5c', fontSize: 28, fontWeight: '800' },
  line: { backgroundColor: '#dce8ef', height: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  label: { color: '#617887', fontSize: 12 },
  detail: { color: '#002f5c', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  warning: { color: '#8c4d0f', backgroundColor: '#fff3e3', borderRadius: 9, padding: 10, fontSize: 12 },
  footer: { borderTopColor: '#dce8ef', borderTopWidth: 1, paddingTop: 12, flexDirection: 'row', gap: 8 },
  disclaimer: { flex: 1, color: '#617887', fontSize: 11, lineHeight: 16 },
});
