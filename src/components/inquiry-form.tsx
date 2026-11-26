
import { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { api } from '@/api/client';
import { ApiError, errorMessage } from '@/api/http';
import {
  inquiryMessageError,
  openInquiry,
} from '@/api/inquiries';
import { useSession } from '@/auth/context';
import { useTekoraTheme } from '@/theme/tekora-theme';

export function InquiryForm({
  serviceId,
}: {
  serviceId: number;
}) {
  const router = useRouter();
  const { user } = useSession();

  // Tema global.
  const { colors } = useTekoraTheme();

  const focused = useRef(false);
  const inFlight = useRef(false);

  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [uncertain, setUncertain] = useState(false);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;

      return () => {
        focused.current = false;
      };
    }, [])
  );

  // Envío original de solicitudes, sin cambios funcionales.
  async function submit() {
    if (
      inFlight.current ||
      uncertain ||
      !focused.current
    ) {
      return;
    }

    const invalid = inquiryMessageError(message);

    if (invalid) {
      setProblem(invalid);
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setProblem(undefined);

    try {
      const result = await openInquiry(
        api,
        serviceId,
        message
      );

      if (focused.current) {
        setMessage('');

        router.push({
          pathname: '/tabs/solicitud',
          params: { id: result.id },
        });
      }
    } catch (error) {
      if (!focused.current) return;

      const ambiguous =
        !(error instanceof ApiError) ||
        error.status >= 500 ||
        error.code === 'network' ||
        error.code === 'invalid_response' ||
        error.code === 'unsafe_redirect';

      setUncertain(ambiguous);

      setProblem(
        ambiguous
          ? 'No se pudo comprobar el envío. Revisa tu historial antes de crear otra solicitud.'
          : error.fields.message?.join(' ') ||
            errorMessage(error)
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  if (
    !user?.permissions.includes(
      'client.inquiries.manage'
    )
  ) {
    return (
      <Text
        style={[
          styles.body,
          { color: colors.muted },
        ]}
      >
        Tu cuenta no puede enviar una solicitud.
      </Text>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: colors.text },
        ]}
      >
        Solicitar este servicio
      </Text>

      <Text
        style={[
          styles.body,
          { color: colors.muted },
        ]}
      >
        Describe el trabajo que necesitas.
        El prestador revisará tu solicitud.
      </Text>

      <TextInput
        accessibilityLabel="Descripción de la solicitud"
        value={message}
        onChangeText={setMessage}
        placeholder="Describe lo que necesitas"
        placeholderTextColor={colors.muted}
        multiline
        maxLength={2000}
        editable={!submitting && !uncertain}
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        textAlignVertical="top"
      />

      {problem && (
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.error,
            { color: colors.error },
          ]}
        >
          {problem}
        </Text>
      )}

      {uncertain ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.button}
          onPress={() =>
            router.navigate({
              pathname: '/tabs/servicios',
              params: { vista: 'historial' },
            })
          }
        >
          <Text style={styles.buttonText}>
            Ver historial
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{
            disabled: submitting,
            busy: submitting,
          }}
          disabled={submitting}
          style={[
            styles.button,
            submitting && styles.disabled,
          ]}
          onPress={() => void submit()}
        >
          <Text style={styles.buttonText}>
            {submitting
              ? 'Enviando…'
              : 'Enviar solicitud'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Únicamente los colores son dinámicos.
// Se conservan dimensiones y distribución.
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderColor: '#eee',
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  title: {
    color: '#1a1a1a',
    fontSize: 17,
    fontWeight: 'bold',
  },
  body: {
    color: '#555',
    lineHeight: 20,
  },
  input: {
    color: '#1a1a1a',
    minHeight: 104,
    backgroundColor: '#f8f9fa',
    borderColor: '#e5ecf3',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  error: {
    color: '#a32622',
  },
  button: {
    backgroundColor: '#005b9f',
    alignItems: 'center',
    borderRadius: 12,
    padding: 13,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.6,
  },
});
