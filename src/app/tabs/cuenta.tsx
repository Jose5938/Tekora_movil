
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { File as NativeFile } from 'expo-file-system';
import { launchImageLibraryAsync } from 'expo-image-picker';

import NavegacionPersonalizada from '@/components/navegacion-personalizada';
import { ApiState } from '@/components/api-state';
import {
  ReservationButton,
  reservationStyles as ui,
} from '@/components/reservation-ui';
import { useSession } from '@/auth/context';
import { api } from '@/api/client';
import {
  ApiError,
  errorMessage,
  retryDeadline,
} from '@/api/http';
import {
  acceptedProfile,
  isProfileResource,
  photoDataUri,
  photoInputError,
  saveProfileName,
  type Profile,
} from '@/api/profile';
import { useApiResource } from '@/hooks/use-api-resource';
import { useTekoraTheme } from '@/theme/tekora-theme';

export default function MiCuentaScreen() {
  const { user } = useSession();

  return user
    ? <Account key={user.id} owner={user.id} />
    : null;
}

function Account({ owner }: { owner: number }) {
  const router = useRouter();
  const { logout, updateProfileName } = useSession();

  // Solo colores compartidos.
  const { colors, darkMode } = useTekoraTheme();

  const resource = useApiResource(
    '/me/profile',
    isProfileResource,
    true
  );

  const [changed, setChanged] = useState<Profile | null>(null);
  const data = changed ?? resource.data?.data;
  const profile = data?.id === owner ? data : null;

  const [photo, setPhoto] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [photoVersion, setPhotoVersion] = useState(0);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const mutation = useRef(false);
  const retryAt = useRef(0);
  const photoRetryAt = useRef(0);
  const hasPhoto = !!profile?.photo_url;

  // Carga original de fotografía.
  useEffect(() => {
    if (!hasPhoto) return;

    let active = true;

    api.readProfilePhoto().then(
      ({ mime, bytes }) => {
        if (active) {
          setPhoto(photoDataUri(mime, bytes));
        }
      },
      failure => {
        if (active) {
          photoRetryAt.current = retryDeadline(failure);
          setPhotoError(errorMessage(failure));
        }
      }
    );

    return () => {
      active = false;
    };
  }, [hasPhoto, owner, photoVersion]);

  // Mutación de perfil original.
  async function changeProfile(
    action: () => Promise<void>
  ) {
    if (mutation.current) return;

    if (Date.now() < retryAt.current) {
      setError('Espera antes de volver a intentarlo.');
      return;
    }

    mutation.current = true;
    setBusy(true);
    setError('');
    setNotice('');

    try {
      await action();
    } catch (failure) {
      retryAt.current = retryDeadline(failure);

      setError(
        failure instanceof ApiError
          ? failure.fields.name?.[0] ??
            failure.fields.photo?.[0] ??
            failure.message
          : 'No se pudo completar el cambio.'
      );
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }

  // Selección original de fotografía.
  async function selectPhoto() {
    const result = await launchImageLibraryAsync({
      mediaTypes: ['images'],
      exif: false,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    const file =
      Platform.OS === 'web'
        ? asset?.file
        : asset
          ? new NativeFile(asset.uri)
          : undefined;

    if (!file) {
      throw new ApiError(
        422,
        'invalid_photo',
        'No se pudo leer la imagen seleccionada.'
      );
    }

    const invalid = photoInputError(
      file.type || asset.mimeType || '',
      file.size
    );

    if (invalid) {
      throw new ApiError(
        422,
        'invalid_photo',
        invalid
      );
    }

    const form = new FormData();
    form.append('photo', file);

    const saved = acceptedProfile(
      await api.uploadProfilePhoto(form),
      owner
    );

    if (!saved.photo_url) {
      throw new ApiError(
        200,
        'invalid_response',
        'Tekora no confirmó la foto de perfil.'
      );
    }

    setChanged(saved);
    setPhoto('');
    setPhotoError('');
    setPhotoVersion(value => value + 1);
    setNotice('Foto de perfil guardada.');
  }

  function open(path: Href) {
    router.push(path);
  }

  // Estilos visuales dinámicos para los contenedores.
  const themedCard = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
      edges={['top']}
    >
      {/* Encabezado */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface },
        ]}
      >
        <Text
          accessibilityRole="header"
          style={[
            styles.headerTitle,
            { color: colors.text },
          ]}
        >
          Mi cuenta
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Preferencias"
          style={styles.iconButton}
          onPress={() =>
            open({
              pathname: '/tabs/ayuda',
              params: { tema: 'preferencias' },
            })
          }
        >
          <Ionicons
            name="settings-outline"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={[
          styles.container,
          { backgroundColor: colors.background },
        ]}
        behavior={
          Platform.OS === 'ios' ? 'padding' : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {!profile && (
            <ApiState
              {...resource}
              error={
                data && data.id !== owner
                  ? new ApiError(
                      200,
                      'invalid_response',
                      'No se pudo verificar el perfil de esta cuenta.'
                    )
                  : resource.error
              }
            />
          )}

          {/* Tarjeta de perfil */}
          {!!profile && (
            <View
              style={[
                styles.profileCard,
                themedCard,
              ]}
            >
              <View
                style={[
                  styles.avatarContainer,
                  { backgroundColor: colors.accent },
                ]}
              >
                {hasPhoto && photo ? (
                  <Image
                    accessibilityLabel="Foto de perfil"
                    source={{ uri: photo }}
                    style={styles.photo}
                    onError={() => {
                      setPhoto('');
                      setPhotoError(
                        'No se pudo mostrar la foto.'
                      );
                    }}
                  />
                ) : (
                  <Ionicons
                    name="person"
                    size={40}
                    color={colors.muted}
                  />
                )}

                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar foto"
                  disabled={busy}
                  onPress={() => {
                    void changeProfile(selectPhoto);
                  }}
                  style={[
                    styles.editAvatarButton,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.surface,
                    },
                  ]}
                >
                  <Ionicons
                    name="camera"
                    size={14}
                    color={colors.buttonText}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.userInfo}>
                <Text
                  style={[
                    styles.userName,
                    { color: colors.text },
                  ]}
                >
                  {profile.name}
                </Text>

                <Text
                  style={[
                    styles.userEmail,
                    { color: colors.muted },
                  ]}
                >
                  {profile.email}
                </Text>

                <View style={styles.userBadge}>
                  <Ionicons
                    name="person-outline"
                    size={14}
                    color={colors.primary}
                  />

                  <Text
                    style={[
                      styles.userBadgeText,
                      { color: colors.primary },
                    ]}
                  >
                    Cuenta solicitante
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Editar nombre"
                disabled={busy}
                onPress={() => setName(profile.name)}
                style={[
                  styles.editProfileButton,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Ionicons
                  name="pencil"
                  size={18}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Error al cargar fotografía */}
          {!!photoError && hasPhoto && (
            <View
              style={[
                ui.card,
                styles.editor,
                themedCard,
              ]}
            >
              <Text
                style={[
                  ui.error,
                  { color: colors.error },
                ]}
                accessibilityLiveRegion="polite"
              >
                {photoError}
              </Text>

              <ReservationButton
                label="Volver a cargar foto"
                onPress={() => {
                  if (Date.now() >= photoRetryAt.current) {
                    setPhotoError('');
                    setPhotoVersion(value => value + 1);
                  }
                }}
              />
            </View>
          )}

          {/* Editor original de nombre */}
          {!!profile && name !== null && (
            <View
              style={[
                ui.card,
                styles.editor,
                themedCard,
              ]}
            >
              <Text
                style={[
                  ui.title,
                  { color: colors.text },
                ]}
              >
                Editar nombre
              </Text>

              <TextInput
                accessibilityLabel="Nombre"
                value={name}
                onChangeText={setName}
                editable={!busy}
                autoComplete="name"
                style={[
                  ui.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
              />

              <ReservationButton
                label={busy ? 'Guardando…' : 'Guardar nombre'}
                disabled={busy}
                onPress={() => {
                  void changeProfile(async () => {
                    const saved = await saveProfileName(
                      api,
                      owner,
                      name
                    );

                    setChanged(saved);
                    updateProfileName(owner, saved.name);
                    setName(null);
                    setNotice('Nombre guardado.');
                  });
                }}
              />

              <ReservationButton
                label="Cancelar edición"
                disabled={busy}
                onPress={() => setName(null)}
              />
            </View>
          )}

          {!!error && (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                ui.error,
                styles.editor,
                { color: colors.error },
              ]}
            >
              {error}
            </Text>
          )}

          {!!notice && (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                ui.badge,
                styles.editor,
                {
                  color: colors.primary,
                  backgroundColor: colors.accent,
                },
              ]}
            >
              {notice}
            </Text>
          )}

          {/* Mi actividad */}
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text },
            ]}
          >
            Mi actividad
          </Text>

          <View
            style={[
              styles.menuGroup,
              themedCard,
            ]}
          >
            <MenuItem
              icon="chatbubble-outline"
              label="Mis solicitudes"
              onPress={() =>
                open({
                  pathname: '/tabs/servicios',
                  params: { vista: 'historial' },
                })
              }
            />

            <MenuItem
              icon="calendar-outline"
              label="Mis reservas"
              onPress={() => open('/tabs/reserva')}
            />

            <MenuItem
              icon="time-outline"
              label="Historial de servicios"
              onPress={() =>
                open({
                  pathname: '/tabs/reserva',
                  params: { vista: 'historial' },
                })
              }
            />

            <MenuItem
              icon="star-outline"
              label="Mis reseñas"
              onPress={() => open('/tabs/resenas')}
            />

            <MenuItem
              icon="notifications-outline"
              label="Notificaciones"
              onPress={() =>
                open('/tabs/notificaciones')
              }
            />
          </View>

          {/* Configuración y soporte */}
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text },
            ]}
          >
            Configuración y soporte
          </Text>

          <View
            style={[
              styles.menuGroup,
              themedCard,
            ]}
          >
            <MenuItem
              icon="heart-outline"
              label="Expertos favoritos"
              onPress={() =>
                open({
                  pathname: '/tabs/ayuda',
                  params: { tema: 'favoritos' },
                })
              }
            />

            <MenuItem
              icon="location-outline"
              label="Mis direcciones"
              onPress={() =>
                open({
                  pathname: '/tabs/ayuda',
                  params: { tema: 'direcciones' },
                })
              }
            />

            <MenuItem
              icon="card-outline"
              label="Métodos de pago"
              onPress={() =>
                open({
                  pathname: '/tabs/ayuda',
                  params: { tema: 'pagos' },
                })
              }
            />

            <MenuItem
              icon="help-buoy-outline"
              label="Centro de ayuda"
              onPress={() => open('/tabs/ayuda')}
            />

            <MenuItem
              icon="shield-checkmark-outline"
              label="Términos y privacidad"
              onPress={() =>
                open({
                  pathname: '/tabs/ayuda',
                  params: { tema: 'privacidad' },
                })
              }
            />
          </View>

          {/* Cierre de sesión original */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            disabled={busy}
            style={[
              styles.logoutButton,
              {
                backgroundColor: darkMode
                  ? '#351D2B'
                  : '#FFEEEE',
              },
            ]}
            onPress={() => {
              if (!mutation.current) {
                setBusy(true);
                void logout().finally(() =>
                  setBusy(false)
                );
              }
            }}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={
                darkMode ? '#FF8A9A' : '#D9534F'
              }
            />

            <Text
              style={[
                styles.logoutText,
                {
                  color: darkMode
                    ? '#FF8A9A'
                    : '#D9534F',
                },
              ]}
            >
              Cerrar sesión
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Barra inferior sincronizada con el tema */}
      <NavegacionPersonalizada darkMode={darkMode} />
    </SafeAreaView>
  );
}

// Conserva exactamente los mismos botones y onPress.
function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTekoraTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.menuItem}
      onPress={onPress}
    >
      <View
        style={[
          styles.menuIconContainer,
          { backgroundColor: colors.accent },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={colors.primary}
        />
      </View>

      <Text
        style={[
          styles.menuLabel,
          { color: colors.text },
        ]}
      >
        {label}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.muted}
      />
    </TouchableOpacity>
  );
}

// Mismas dimensiones y distribución del archivo original.
const styles = StyleSheet.create({
  photo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  editor: {
    marginBottom: 16,
  },
  userEmail: {
    color: '#555',
    fontSize: 13,
    marginBottom: 8,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  iconButton: {
    padding: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 16,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#005b9f',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userBadgeText: {
    fontSize: 13,
    color: '#005b9f',
    marginLeft: 4,
    fontWeight: '600',
  },
  editProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 8,
    marginBottom: 24,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f4f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#d9534f',
    marginLeft: 8,
  },
});
