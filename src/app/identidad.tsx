import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, type TextInputProps } from 'react-native';
import { api } from '@/api/client';
import { ApiError, errorMessage, retryDeadline, type FieldErrors } from '@/api/http';
import { identityCommand, identityErrors, type IdentityMode } from '@/api/identity';
import { ModuleScreen } from '@/components/module-screen';
import { ReservationButton, reservationStyles as ui } from '@/components/reservation-ui';

const genders = ['Femenino', 'Masculino', 'Otro', 'Prefiero no decirlo'];

function Field({ label, errors, ...props }: TextInputProps & { label: string; errors?: string[] }) {
  return <View style={ui.group}>
    <Text style={ui.text}>{label}</Text>
    <TextInput accessibilityLabel={label} style={ui.input} {...props} />
    {!!errors?.length && <Text style={ui.error}>{errors.join(' ')}</Text>}
  </View>;
}

export default function IdentityScreen() {
  const { modo } = useLocalSearchParams<{ modo?: string }>();
  const mode = modo === 'recuperar' ? 'recover' : 'register';
  return <IdentityForm key={mode} mode={mode} />;
}

function IdentityForm({ mode }: { mode: IdentityMode }) {
  const router = useRouter();
  const register = mode === 'register';
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fields, setFields] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const retryAt = useRef(0);

  async function submit() {
    if (sending.current) return;
    if (Date.now() < retryAt.current) {
      setError('Espera antes de volver a intentarlo.');
      return;
    }
    const credentials = step === 'code' ? { token, password, confirmation } : undefined;
    const registration = register && credentials ? { name, age, gender } : undefined;
    const validation = identityErrors(email.trim(), credentials, registration);
    setFields(validation);
    setError('');
    if (Object.keys(validation).length) return;
    sending.current = true;
    setBusy(true);
    try {
      setMessage(await identityCommand(api, mode, email, credentials, registration));
      setStep(credentials ? 'done' : 'code');
      if (credentials) {
        setToken('');
        setPassword('');
        setConfirmation('');
      }
    } catch (failure) {
      retryAt.current = retryDeadline(failure);
      setError(errorMessage(failure));
      if (failure instanceof ApiError) setFields(failure.fields);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return <ModuleScreen title={register ? 'Crear cuenta' : 'Recuperar contraseña'} fallback="/login" keyboard>
    <View style={ui.card}>
      {!!message && <Text style={ui.text} accessibilityLiveRegion="polite">{message}</Text>}
      {!!error && <Text style={ui.error} accessibilityLiveRegion="polite">{error}</Text>}
      {step !== 'done' && <>
        <Field label="Correo electrónico" value={email} onChangeText={setEmail}
          editable={!busy && step === 'email'} keyboardType="email-address" autoComplete="email"
          autoCapitalize="none" autoCorrect={false} maxLength={255} errors={fields.email} />
        {step === 'code' && <>
          <Text style={ui.text}>Pega el código completo que recibiste por correo.</Text>
          <Field label="Código del correo" value={token} onChangeText={setToken} secureTextEntry
            editable={!busy} autoCapitalize="none" autoCorrect={false} maxLength={4096} errors={fields.token} />
          {register && <>
            <Field label="Nombre" value={name} onChangeText={setName} editable={!busy} maxLength={255}
              autoComplete="name" errors={fields.name} />
            <Field label="Edad" value={age} onChangeText={setAge} editable={!busy} keyboardType="number-pad"
              maxLength={3} errors={fields.age} />
            <Text style={ui.text}>Género</Text>
            <View style={styles.options}>
              {genders.map(value => <TouchableOpacity key={value} accessibilityRole="radio"
                accessibilityState={{ checked: value === gender, disabled: busy }} disabled={busy}
                onPress={() => setGender(value)} style={[ui.input, value === gender && styles.selected]}>
                <Text style={ui.text}>{value}</Text>
              </TouchableOpacity>)}
            </View>
            {!!fields.gender && <Text style={ui.error}>{fields.gender.join(' ')}</Text>}
          </>}
          <Field label="Nueva contraseña" value={password} onChangeText={setPassword} editable={!busy}
            secureTextEntry autoComplete="new-password" errors={fields.password} />
          <Field label="Confirmar contraseña" value={confirmation} onChangeText={setConfirmation} editable={!busy}
            secureTextEntry autoComplete="new-password" errors={fields.password_confirmation} />
        </>}
        <ReservationButton label={busy ? 'Enviando…' : step === 'email' ? 'Solicitar código' : register ? 'Crear mi cuenta' : 'Cambiar contraseña'}
          disabled={busy} onPress={() => { void submit(); }} />
        {step === 'code' && <ReservationButton label="Volver a solicitar un código" disabled={busy} onPress={() => {
          setStep('email'); setToken(''); setPassword(''); setConfirmation(''); setFields({}); setError(''); setMessage('');
        }} />}
      </>}
      {step === 'done' && <ReservationButton label="Ir a iniciar sesión" onPress={() => router.replace('/login')} />}
    </View>
  </ModuleScreen>;
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selected: { borderColor: '#005b9f', backgroundColor: '#e1f5fe' },
});
