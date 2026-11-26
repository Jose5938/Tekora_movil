
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSession } from '@/auth/context';
import { ApiError, errorMessage, type FieldErrors } from '@/api/http';

const COLORS = {
  background: '#030817',
  surface: '#07152A',
  input: '#061126',
  cyan: '#00B4D8',
  cyanLight: '#90E0EF',
  frost: '#CAF0F8',
  blue: '#0077B6',
  white: '#EAFBFF',
  muted: '#A3B6CC',
  border: '#29425B',
  error: '#FF8A9A',
  buttonText: '#031526',
};

// Logo de Tekora construido con React Native.
// No necesita archivos PNG ni SVG.
function TekoraBrand() {
  return (
    <View
      style={styles.brand}
      accessibilityLabel="Tekora"
      accessible
    >
      <View style={styles.mark}>
        <View style={styles.markLeft} />
        <View style={styles.markRight} />
      </View>

      <Text style={styles.brandName}>
        tekora<Text style={styles.brandDot}>.</Text>
      </Text>
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, message } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldErrors>({});
  const submitting = useRef(false);

  // Conservamos la autenticación original.
  const iniciarSesion = async () => {
    if (submitting.current) return;

    const validation: FieldErrors = {};

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      email.trim().length > 255
    ) {
      validation.email = [
        'Ingresa un correo electrónico válido.',
      ];
    }

    if (!password || password.length > 1024) {
      validation.password = [
        'Ingresa tu contraseña (máximo 1024 caracteres).',
      ];
    }

    setFields(validation);
    setError(null);

    if (Object.keys(validation).length) return;

    submitting.current = true;
    setLoading(true);

    try {
      await login(email, password);
    } catch (failure) {
      setError(errorMessage(failure));

      if (failure instanceof ApiError) {
        setFields(failure.fields);
      }
    } finally {
      setPassword('');
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === 'ios' ? 'padding' : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Encabezado y logo */}
          <View style={styles.header}>
            <TekoraBrand />

            <View style={styles.eyebrowContainer}>
              <View style={styles.dot} />

              <Text style={styles.eyebrow}>
                TALENTO QUE CONECTA
              </Text>
            </View>

            <Text style={styles.title}>
              ¡Bienvenido{' '}
              <Text style={styles.titleAccent}>
                de nuevo!
              </Text>
            </Text>

            <Text style={styles.subtitle}>
              Inicia sesión y convierte tus ideas en realidad.
            </Text>
          </View>

          {/* Formulario de acceso */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              Accede a tu cuenta
            </Text>

            <Text style={styles.formSubtitle}>
              Ingresa tus credenciales para continuar.
            </Text>

            {!!message && (
              <Text
                style={styles.notice}
                accessibilityLiveRegion="polite"
              >
                {message}
              </Text>
            )}

            {!!error && (
              <Text
                style={styles.error}
                accessibilityLiveRegion="polite"
              >
                {error}
              </Text>
            )}

            {/* Correo electrónico */}
            <Text style={styles.inputLabel}>
              Correo electrónico
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.cyanLight}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#7890A5"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                accessibilityLabel="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                maxLength={255}
              />
            </View>

            {!!fields.email && (
              <Text style={styles.error}>
                {fields.email.join(' ')}
              </Text>
            )}

            {/* Contraseña */}
            <Text style={styles.inputLabel}>
              Contraseña
            </Text>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.cyanLight}
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="#7890A5"
                secureTextEntry={!mostrarPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                accessibilityLabel="Contraseña"
                value={password}
                onChangeText={setPassword}
                editable={!loading}
                maxLength={1024}
                onSubmitEditing={() => {
                  void iniciarSesion();
                }}
              />

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  mostrarPassword
                    ? 'Ocultar contraseña'
                    : 'Mostrar contraseña'
                }
                onPress={() =>
                  setMostrarPassword(!mostrarPassword)
                }
                style={styles.eyeButton}
              >
                <Ionicons
                  name={
                    mostrarPassword
                      ? 'eye-outline'
                      : 'eye-off-outline'
                  }
                  size={21}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>

            {!!fields.password && (
              <Text style={styles.error}>
                {fields.password.join(' ')}
              </Text>
            )}

            {!!fields.device_name && (
              <Text style={styles.error}>
                {fields.device_name.join(' ')}
              </Text>
            )}

            {/* Recuperar contraseña */}
            <TouchableOpacity
              accessibilityRole="button"
              disabled={loading}
              style={styles.forgotButton}
              onPress={() =>
                router.push({
                  pathname: '/identidad',
                  params: { modo: 'recuperar' },
                })
              }
            >
              <Text style={styles.forgotText}>
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>

            {/* Botón de inicio de sesión */}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{
                disabled: loading,
                busy: loading,
              }}
              disabled={loading}
              activeOpacity={0.85}
              style={[
                styles.loginButton,
                loading && styles.disabled,
              ]}
              onPress={() => {
                void iniciarSesion();
              }}
            >
              {loading ? (
                <ActivityIndicator
                  color={COLORS.buttonText}
                />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.loginButtonText}>
                    Iniciar sesión
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={COLORS.buttonText}
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Registro */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿Todavía no tienes una cuenta?{' '}
            </Text>

            <TouchableOpacity
              accessibilityRole="button"
              disabled={loading}
              onPress={() =>
                router.push({
                  pathname: '/identidad',
                  params: { modo: 'registro' },
                })
              }
            >
              <Text style={styles.footerLink}>
                Regístrate
              </Text>
            </TouchableOpacity>
          </View>

          {Platform.OS === 'web' && (
            <Text style={styles.webNotice}>
              Vista web: la sesión se conserva solo mientras
              esta página permanezca abierta.
            </Text>
          )}

          {/* Pie de página */}
          <View style={styles.bottomBrand}>
            <View style={styles.bottomLine} />

            <Text style={styles.bottomText}>
              TEKORA / IDEAS QUE ENCUENTRAN TALENTO
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  keyboardContainer: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 32,
  },

  header: {
    alignItems: 'center',
    marginBottom: 30,
  },

  // Logo Tekora
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    minHeight: 64,
  },

  mark: {
    position: 'relative',
    width: 42,
    height: 42,
    marginRight: 10,
  },

  markLeft: {
    position: 'absolute',
    top: 5,
    left: 2,
    width: 24,
    height: 27,
    borderRadius: 4,
    backgroundColor: COLORS.cyanLight,
    transform: [{ skewX: '-17deg' }],
  },

  markRight: {
    position: 'absolute',
    top: 11,
    left: 22,
    width: 15,
    height: 22,
    borderRadius: 4,
    backgroundColor: COLORS.blue,
    transform: [{ skewX: '-17deg' }],
  },

  brandName: {
    fontSize: 35,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -1.7,
  },

  brandDot: {
    color: COLORS.cyan,
  },

  eyebrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.cyan,
    marginRight: 8,
  },

  eyebrow: {
    color: COLORS.cyanLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.8,
  },

  titleAccent: {
    color: COLORS.cyanLight,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 10,
  },

  // Tarjeta del formulario
  formCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    padding: 22,
  },

  formTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 6,
  },

  formSubtitle: {
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.muted,
    marginBottom: 26,
  },

  inputLabel: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 9,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 13,
    backgroundColor: COLORS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    marginBottom: 19,
  },

  inputIcon: {
    marginRight: 11,
  },

  input: {
    flex: 1,
    height: '100%',
    color: COLORS.white,
    fontSize: 14,
  },

  eyeButton: {
    padding: 6,
  },

  forgotButton: {
    alignSelf: 'flex-end',
    paddingVertical: 5,
    marginBottom: 23,
  },

  forgotText: {
    color: COLORS.cyanLight,
    fontSize: 12,
    fontWeight: '600',
  },

  // Botón principal
  loginButton: {
    backgroundColor: COLORS.cyan,
    height: 55,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.buttonText,
    marginRight: 12,
  },

  disabled: {
    opacity: 0.55,
  },

  // Registro
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 28,
  },

  footerText: {
    fontSize: 12,
    color: COLORS.muted,
  },

  footerLink: {
    fontSize: 12,
    color: COLORS.cyanLight,
    fontWeight: '700',
  },

  // Mensajes
  notice: {
    color: COLORS.cyanLight,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
    textAlign: 'center',
  },

  error: {
    color: COLORS.error,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },

  webNotice: {
    marginTop: 18,
    color: COLORS.muted,
    textAlign: 'center',
    fontSize: 11,
  },

  // Pie de página
  bottomBrand: {
    alignItems: 'center',
    marginTop: 34,
  },

  bottomLine: {
    width: 35,
    height: 2,
    backgroundColor: COLORS.cyan,
    marginBottom: 12,
  },

  bottomText: {
    color: '#7890A5',
    letterSpacing: 1.4,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
});
