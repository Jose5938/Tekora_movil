import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter,useLocalSearchParams } from 'expo-router';

export default function ChatScreen() {
    const { autoMsg } = useLocalSearchParams();
    const [mensajeActual, setMensajeActual] = useState(autoMsg ? String(autoMsg) : '');
  const router = useRouter();

  // Arreglo con los mensajes de prueba
  const messages = [
    { id: '1', sender: 'tech', text: 'Hola, Ana. Soy Carlos, tu técnico. ¿El congelador sí está enfriando?', time: '09:32' },
    { id: '2', sender: 'user', text: 'Hola, Carlos. Sí, el congelador funciona; la parte de abajo no enfría.', time: '09:34' },
    { id: '3', sender: 'tech', text: 'Gracias. Nos vemos el jueves 12, entre 10:00 y 12:00 h. El diagnóstico cuesta $350 MXN.', time: '09:35' },
    { id: '4', sender: 'user', text: 'Perfecto, te espero en Colima 145, int. 4. El timbre dice López.', time: '09:37' },
    { id: '5', sender: 'tech', text: 'Cita confirmada. Te aviso cuando vaya en camino. ¡Hasta mañana!', time: '09:38' },
    { id: '6', sender: 'user', text: '¡Gracias! Nos vemos mañana.', time: '09:40' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 10} >        
        {/* Cabecera del Chat */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#002f5c" />
          </TouchableOpacity>
          
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color="#ccc" />
          </View>
          
          <View style={styles.headerInfo}>
            <Text style={styles.techName}>Carlos Mendoza</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>En línea · Técnico verificado</Text>
            </View>
          </View>
          {/* Se omitió el icono de llamada como solicitaste */}
        </View>

       {/* Banner de la cita actualizado a botón */}
        <TouchableOpacity 
          style={styles.appointmentBanner} 
          onPress={() => router.push('/tabs/reserva')}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={24} color="#005b9f" style={styles.bannerIcon} />
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerTitle}>Diagnóstico de refrigerador · RP-1248</Text>
            <Text style={styles.bannerDetails}>12 nov · 10:00–12:00 h · $350 MXN</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#005b9f" />
        </TouchableOpacity>

        {/* Área de Mensajes */}
        <ScrollView contentContainerStyle={styles.chatScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.dateSeparator}>MIÉRCOLES, 11 DE NOVIEMBRE</Text>

          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <View key={msg.id} style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperTech]}>
                <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleTech]}>
                  <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextTech]}>
                    {msg.text}
                  </Text>
                  <View style={styles.timeContainer}>
                    <Text style={[styles.timeText, isUser ? styles.timeTextUser : styles.timeTextTech]}>
                      {msg.time}
                    </Text>
                    {isUser && <Ionicons name="checkmark-done" size={14} color="#fff" style={styles.readIcon} />}
                  </View>
                </View>
              </View>
            );
          })}

          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#888" />
            <Text style={styles.securityText}>Por tu seguridad, acuerda todo desde Tekora.</Text>
          </View>
        </ScrollView>

      {/* Input para escribir mensaje */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="add" size={28} color="#005b9f" />
          </TouchableOpacity>
          
          <View style={styles.textInputWrapper}>
            <TextInput 
              style={styles.textInput}
              value={mensajeActual}               
              onChangeText={setMensajeActual}     
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#999"
              multiline
            />
          </View>

          <TouchableOpacity style={styles.sendButton}>
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  
  // Cabecera
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backButton: { marginRight: 12 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e1e1e1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerInfo: { flex: 1 },
  techName: { fontSize: 16, fontWeight: 'bold', color: '#002f5c', marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#009688', marginRight: 6 },
  statusText: { fontSize: 12, color: '#009688', fontWeight: '500' },
  
  // Banner
  appointmentBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f8ff', padding: 12, borderBottomWidth: 2, borderBottomColor: '#005b9f' },
  bannerIcon: { marginRight: 12 },
  bannerInfo: { flex: 1 },
  bannerTitle: { fontSize: 13, fontWeight: 'bold', color: '#002f5c', marginBottom: 2 },
  bannerDetails: { fontSize: 12, color: '#005b9f' },
  
  // Chat
  chatScroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  dateSeparator: { alignSelf: 'center', fontSize: 11, color: '#999', fontWeight: 'bold', marginVertical: 16, letterSpacing: 0.5 },
  
  messageWrapper: { marginBottom: 16, flexDirection: 'row' },
  messageWrapperTech: { justifyContent: 'flex-start' },
  messageWrapperUser: { justifyContent: 'flex-end' },
  
  messageBubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  messageBubbleTech: { backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  messageBubbleUser: { backgroundColor: '#0073B4', borderBottomRightRadius: 4 },
  
  messageText: { fontSize: 14, lineHeight: 20 },
  messageTextTech: { color: '#333' },
  messageTextUser: { color: '#fff' },
  
  timeContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 },
  timeText: { fontSize: 10 },
  timeTextTech: { color: '#888' },
  timeTextUser: { color: '#cce5ff' },
  readIcon: { marginLeft: 4 },
  
  securityNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  securityText: { fontSize: 11, color: '#888', marginLeft: 6 },
  
  // Input
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  attachButton: { padding: 4, marginRight: 8 },
  textInputWrapper: { flex: 1, backgroundColor: '#f5f7f9', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100 },
  textInput: { fontSize: 15, color: '#333', maxHeight: 80 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0073B4', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
});