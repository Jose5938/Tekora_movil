import { StyleSheet, Text, View } from 'react-native';

export function PreparationNotice({ children }: { children: string }) {
  return <View style={styles.notice}><Text style={styles.title}>En preparación</Text><Text style={styles.text}>{children}</Text></View>;
}
const styles = StyleSheet.create({
  notice: { margin: 16, padding: 16, borderRadius: 14, backgroundColor: '#e1f5fe', borderWidth: 1, borderColor: '#b3e5fc' },
  title: { color: '#005b9f', fontWeight: 'bold', marginBottom: 6 },
  text: { color: '#333', fontSize: 14, lineHeight: 21 },
});
