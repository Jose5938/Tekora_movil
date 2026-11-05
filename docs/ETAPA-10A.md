# Tekora móvil — Etapa 10A

Integración de la interfaz Expo existente con la API Laravel. Rama `codex/tekora-movil-etapa-10a`, base `master`, SHA inicial `ddc4d4e0815ac18152b1ed36278fe1d317a25edc`. La entrega permanece en PR borrador para revisión independiente de ChatGPT y aprobación del usuario; no autoriza fusionar ni desplegar.

La revisión posterior de compatibilidad Node 22/24, actualización de dependencias y auditorías residuales está en [SEGURIDAD-10A.md](SEGURIDAD-10A.md).

## Contrato y alcance

Se consultó [OpenAPI del backend](https://github.com/Fernando261/tekora-project/blob/1f0926ca9fc0bf2c70a34c1e64af0b98a31d6957/docs/api/openapi.json), fijado al SHA `1f0926ca9fc0bf2c70a34c1e64af0b98a31d6957`. No se modificó Laravel. Se conservan las pantallas, sus estilos, tarjetas y navegación inferior. Los atajos del inicio sustituyen categorías ficticias por accesos a funciones de la app; Servicios conserva las tarjetas y cambia la lista ficticia de citas por el catálogo público.

| Pantalla | Conexión |
| --- | --- |
| `login.tsx` | `POST /auth/login`, con `email`, `password`, `device_name`; respuesta `data.token_type/access_token/expires_at/user` |
| `tabs/index.tsx` | `GET /providers`, búsqueda `q`, paginación; saludo con identidad real; logout real |
| `tabs/servicios.tsx` | `GET /services`, búsqueda `q`, paginación; historial en preparación |
| `tabs/perfil-experto.tsx` | `GET /providers/{id}` con ID real |
| `tabs/detalle-servicio.tsx` | `GET /services/{id}` con ID real; acceso al perfil de su prestador |
| `tabs/cuenta.tsx` | Identidad comprobada por la sesión; logout real |
| `tabs/chat.tsx` | Conversación de ejemplo rotulada; adjuntar y enviar deshabilitados |
| `tabs/publicar.tsx` | Formulario de demostración; campos, fotos y publicación deshabilitados |
| `tabs/reserva.tsx` | Vista de reserva en preparación; sin técnico, fecha, dirección o importe asignados |
| `tabs/pago.tsx` | Vista de pagos en preparación; sin tarjeta/cuenta/importe, sin simulación de éxito |

Las únicas pantallas con contenido ilustrativo son chat (dos mensajes de ejemplo) y publicación (categorías y placeholders del formulario). Reserva y pago muestran campos sin asignar. No quedan expertos, servicios, precios, distancias, reseñas, verificaciones o disponibilidades ficticias en el catálogo. Los iconos de persona son placeholders; la API no entrega fotografías. Google, Apple, registro, recuperación de contraseña y opciones de cuenta no respaldadas se conservan deshabilitados con explicación.

## HTTP, sesión y navegación

- `src/api/http.ts`: JSON, errores de red, timeout de 15 segundos, campos `error.code/message/fields`, estados 401/403/404/409/422/429 y `Retry-After`. No reintenta automáticamente escrituras. Combina peticiones concurrentes al mismo endpoint y credencial; no usa contraseñas como claves de deduplicación. El formulario y el controlador bloquean envíos repetidos.
- Solo `/me` y `/auth/logout` reciben Bearer; el catálogo sigue siendo público incluso al usarlo desde una sesión autenticada. No se envían cookies web.
- `src/auth/session.ts`: restaura la credencial y comprueba `GET /me` antes de permitir acceso privado. Revalida al volver a primer plano; comprueba expiración mediante temporizador y antes de usar el token. Un 401 protegido, incluso sin JSON, elimina la credencial. Un 401 del formulario no abre sesión. Un 403 durante `/me` también retira acceso.
- En Android/iOS, `expo-secure-store` guarda solo token y expiración, más una etiqueta estable de instalación independiente. La identidad se obtiene de `/me`; no se guarda la contraseña. Se usa `WHEN_UNLOCKED_THIS_DEVICE_ONLY` en iOS. No hay tokens en logs, URLs, AsyncStorage ni variables `EXPO_PUBLIC_`.
- SecureStore no ofrece almacenamiento web. En esa plataforma la credencial solo vive en memoria; recargar exige login. No hay fallback a localStorage, sessionStorage o cookies. La etiqueta web cambia al recargar.
- El logout intenta `POST /auth/logout` y elimina la credencial local en todos los casos. Si no se confirma la revocación, el login muestra un aviso explícito; no se afirma que el servidor haya revocado el token. En nativo, un login posterior con la misma etiqueta reemplaza el token anterior según el contrato. En web, recargar cambia la etiqueta y no garantiza ese reemplazo: un token no revocado puede durar hasta su expiración o revocación del lado servidor.
- Si falla el borrado seguro, se bloquea el acceso y se ofrece reintentar. Si falla la conexión durante restauración, se muestra una pantalla de error sin datos privados; reintentar vuelve a comprobar `/me`.
- `Stack.Protected` protege todo `tabs` y la ruta de ejemplo `explore`. Durante la comprobación de sesión se muestra únicamente un estado neutro. La barra inferior se movió fuera de `src/app` para que no se registre como pantalla; se corrigieron sus rutas activas y se usa `router.navigate` para los accesos inferiores.

No hay refresh token. La revocación del lado servidor se detecta en la siguiente comprobación de identidad o respuesta 401 protegida; el catálogo público no comprueba identidad.

## Dependencias y ajustes mínimos

| Dependencia añadida | Motivo |
| --- | --- |
| `expo-secure-store ~58.0.2` | Almacenamiento nativo seguro, versión del mapa incluido con Expo 58; plugin añadido a `app.json` |
| `eslint ^9.39.5` (desarrollo) | El repo no tenía lint instalado; necesario para `npx expo lint` |
| `eslint-config-expo ~58.0.4` (desarrollo) | Reglas compatibles con el SDK y configuración plana |

En la integración inicial se usó `npx expo install` para las incorporaciones. La API de compatibilidad de Expo no estaba accesible, por lo que esa instalación usó `EXPO_OFFLINE=1` y el mapa local del SDK. npm sí tuvo acceso a su registro. La revisión de seguridad posterior actualiza las resoluciones transitivas compatibles de shell-quote y paquetes Expo sin cambiar `package.json`; sus versiones y justificaciones están en [SEGURIDAD-10A.md](SEGURIDAD-10A.md).

Se corrigieron incompatibilidades previas de TypeScript en los ejemplos: `useColorScheme()` puede devolver null y no devuelve `unspecified`; el prop `ref` heredado del tipo de ejemplo de pestañas web no coincide con el de Pressable. La hidratación del tema web usa `useSyncExternalStore`, conservando el tema claro en render estático. No se cambió la versión de Expo, React, React Native ni Router, ni se crearon directorios nativos.

Documentación oficial consultada antes de modificar librerías o navegación:

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [SecureStore 58](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/), [Router 58](https://docs.expo.dev/versions/v58.0.0/sdk/router/), [SplashScreen 58](https://docs.expo.dev/versions/v58.0.0/sdk/splash-screen/).
- [Índice oficial Expo](https://docs.expo.dev/llms.txt), [autenticación](https://docs.expo.dev/router/advanced/authentication/) y [rutas protegidas](https://docs.expo.dev/router/advanced/protected/).
- [AppState](https://reactnative.dev/docs/appstate) y [TextInput](https://reactnative.dev/docs/textinput) de React Native.

## Ejecutar en Windows / Expo

Usar Node 22.13.0 o Node 24.22.1, npm y Git. El ejecutor de pruebas se verificó con ambas versiones. En un clon independiente del repositorio móvil:

```powershell
git clone --branch codex/tekora-movil-etapa-10a https://github.com/Jose5938/Tekora_movil.git Tekora-movil-10a
Set-Location .\Tekora-movil-10a
npm.cmd ci
Copy-Item .env.example .env.local
notepad .env.local
```

Sustituir únicamente `IP_LOCAL_DEL_EQUIPO` por la dirección LAN del equipo que ejecuta el backend:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://IP_LOCAL_DEL_EQUIPO:8013/api/v1
```

Esta variable solo contiene una dirección pública de configuración. No introducir tokens, contraseñas, claves Laravel ni secretos. `.env.local` está ignorado por Git. Reiniciar Metro tras editarla:

En un clon nuevo sin `expo-env.d.ts`, ejecutar primero `npx.cmd expo start --offline` y detener con Ctrl+C cuando Expo genere los tipos locales. No editar ni versionar ese archivo ni `.expo/types`; son necesarios para el chequeo de TypeScript.

```powershell
npx.cmd tsc --noEmit
npx.cmd expo lint
npx.cmd expo-doctor
npm.cmd test
npx.cmd expo start --lan --clear
```

Usar un cliente Expo compatible con SDK 58. SecureStore está incluido en Expo Go según la documentación de SDK 58; un development build anterior que no lo incluya necesita reconstruirse mediante el flujo habitual de Expo/EAS. No crear ni editar `ios/` o `android/` manualmente. Para inspeccionar el diseño web, usar `npx.cmd expo start --web`; en web la sesión no persiste tras recargar y aplica CORS del navegador.

No se ejecutaron Windows, emuladores ni dispositivos físicos en esta entrega.

## Conectar con Laravel en una red local aislada

1. El responsable del backend debe preparar un clon de validación con la API 9B y una base de datos independiente, con cuentas solicitantes de prueba y catálogo publicado. Usar la [guía de validación de seguridad 9B](https://github.com/Fernando261/tekora-project/blob/1f0926ca9fc0bf2c70a34c1e64af0b98a31d6957/docs/api/LARAGON-9B-SEGURIDAD.md) y sus referencias. Esta entrega móvil no modifica configuración, esquema, cuentas ni datos del backend.
2. Desde ese backend aislado ya preparado, exponer el servidor solo durante la prueba en la LAN:

   ```powershell
   php artisan serve --host=0.0.0.0 --port=8013
   ```

3. Equipo y teléfono deben estar en la misma red local de prueba sin aislamiento entre clientes. Consultar `ipconfig` para elegir la IPv4 de esa interfaz. El firewall debe permitir el puerto 8013 desde esa red privada y el acceso al servidor Metro de Expo. No redirigir puertos del router ni publicar el servidor en Internet.
4. Abrir en el navegador del teléfono `http://IP_LOCAL_DEL_EQUIPO:8013/api/v1/services`. Debe responder JSON. Después usar esa misma base, terminada en `/api/v1`, en `.env.local`.
5. `127.0.0.1` y `localhost` en un teléfono físico apuntan al propio teléfono, no al equipo que ejecuta Laravel. `0.0.0.0` es la dirección de escucha del servidor; tampoco se usa como URL del cliente.
6. Iniciar la app y entrar con una cuenta solicitante de esa base aislada. Los datos de Google/Apple no sirven para este formulario. HTTPS es necesario fuera de esta LAN de desarrollo; SecureStore no cifra el tráfico HTTP.
7. Si la vista web falla por CORS, corresponde revisar la configuración de ese backend por separado. La app nativa no depende de CORS del navegador. No cambiar Laravel como parte de este PR para ocultar ese problema.

## Controles reproducibles con Laravel

Ejecutar con cuentas y recursos de prueba del entorno aislado, sin grabar cabeceras o cuerpos de autenticación:

| Control | Resultado esperado |
| --- | --- |
| Login correcto | Inicio con nombre de `/auth/login`, prestadores públicos y cuenta real |
| Contraseña incorrecta | 401 visible; permanece en login y no se guarda credencial |
| Campos inválidos / límite de intentos | Validación local o 422 por campo; 429 visible sin sesión falsa |
| Cerrar y reabrir app nativa | Estado neutro hasta `/me`; solo entonces se muestra el área privada |
| Revocar token en entorno aislado y volver a primer plano | `/me` devuelve 401; se elimina el token y aparece login |
| Expiración | Login al caducar; el reloj inyectado en `npm test` verifica este caso sin cambiar la hora del sistema |
| Logout desde inicio o cuenta | `POST /auth/logout`; `/me` con el token anterior da 401; reiniciar app no restaura sesión |
| Sin autenticación / enlace directo a cuenta, chat, reserva o pago | Login sin datos privados intermedios |
| Catálogo | Listas y detalles con IDs existentes; endpoints públicos no requieren Bearer |
| Servicio retirado entre lista y detalle | 404 visible, sin tarjetas ficticias de reemplazo |
| Backend detenido / lista vacía | Error de conexión o estado vacío, con reintento |
| Chat, publicación, reserva, pago | Avisos visibles; no se envían operaciones ni aparecen éxitos falsos |

Los resultados ejecutados y las limitaciones están en [VALIDACION-10A.md](VALIDACION-10A.md). La verificación nativa y la integración HTTP contra Laravel quedan para la revisión independiente: no se proporcionó una instancia Laravel accesible ni se usaron credenciales reales.
