import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Función temporal que simula el inicio de sesión y te manda al index (tabs)
  const iniciarSesion = () => {
    router.replace('/tabs');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Logo y Bienvenida */}
          <View style={styles.headerContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="build" size={32} color="#fff" />
            </View>
            <Text style={styles.title}>Te damos la bienvenida a Tekora</Text>
            <Text style={styles.subtitle}>Inicia sesión para gestionar tus reparaciones</Text>
          </View>

          {/* Formulario Tradicional */}
          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>Correo electrónico</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput 
                style={styles.input}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#aaa"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.inputLabel}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput 
                style={styles.input}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="#aaa"
                secureTextEntry={!mostrarPassword}
              />
              <TouchableOpacity onPress={() => setMostrarPassword(!mostrarPassword)} style={styles.eyeIcon}>
                <Ionicons name={mostrarPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButton} onPress={iniciarSesion}>
              <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>

          {/* Separador */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>O continúa con</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Botones Sociales */}
          <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialButton} onPress={iniciarSesion}>
              <Ionicons name="logo-google" size={24} color="#DB4437" />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} onPress={iniciarSesion}>
              <Ionicons name="logo-apple" size={24} color="#000" />
              <Text style={styles.socialButtonText}>Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Registro */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>¿No tienes una cuenta? </Text>
            <TouchableOpacity onPress={iniciarSesion}>
              <Text style={styles.footerLink}>Regístrate</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  keyboardContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  
  headerContainer: { alignItems: 'center', marginBottom: 40 },
  logoIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#005b9f', justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20 },
  
  formContainer: { marginBottom: 30 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f7f9', borderWidth: 1, borderColor: '#e4ebf1', borderRadius: 14, paddingHorizontal: 14, marginBottom: 20, height: 56 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#333', height: '100%' },
  eyeIcon: { padding: 4 },
  
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 24 },
  forgotPasswordText: { fontSize: 13, color: '#005b9f', fontWeight: '600' },
  
  primaryButton: { backgroundColor: '#005b9f', borderRadius: 14, height: 56, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#005b9f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#eee' },
  dividerText: { marginHorizontal: 16, fontSize: 13, color: '#888', fontWeight: '500' },
  
  socialContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 40 },
  socialButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4ebf1', borderRadius: 14, height: 56, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  socialButtonText: { fontSize: 15, fontWeight: '600', color: '#333', marginLeft: 10 },
  
  footerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 'auto' },
  footerText: { fontSize: 14, color: '#666' },
  footerLink: { fontSize: 14, color: '#005b9f', fontWeight: 'bold' },
});