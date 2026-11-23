# Tekora Móvil · Staging HTTPS y validación Android

La app consume Laravel por `/api/v1`. La VPS gestiona MySQL 8.4 detrás de Laravel. La URL pública se incorpora al bundle de Expo mediante `EXPO_PUBLIC_API_BASE_URL`. Si cambia el dominio, vuelve a generar el bundle para ese entorno. Las cuentas de prueba se introducen en la app y los códigos se reciben en el correo sintético. [Variables de Expo SDK 58](https://github.com/expo/expo/blob/sdk-58/docs/pages/guides/environment-variables.mdx)

## Contratos revisados

La referencia es OpenAPI 1.7.0 del backend publicada en `2aabf7a0e64648b6ce3378fc1013c11a77f80072`. La revisión se hizo sobre la especificación remota. La matriz de dispositivo comprueba después que staging implemente la misma revisión o una compatible. [OpenAPI de Laravel](https://github.com/Fernando261/tekora-project/blob/2aabf7a0e64648b6ce3378fc1013c11a77f80072/docs/api/openapi.json)

| Etapa | Contrato que usa la app |
| --- | --- |
| M2.2 | Alta y consulta de solicitudes propias y seguimiento mediante `/inquiries/{id}/journey`. |
| M2.3 | Listado y emisión de cotizaciones, detalle y aceptación explícita. La emisión conserva el UUID al reintentar. |
| M2.4–M2.5 | Disponibilidad, opciones, propuesta con revisión de disponibilidad y cotización, cancelación y confirmación B2 con versión y UUID. La app ofrece confirmar con lecturas concordantes de la reserva, el contexto y el seguimiento, y con retención vigente. |
| M2.6–M2.7 | Conversaciones con cursor, mensajes con UUID, marcado de lectura por token y avisos por origen e ID. Revalidación de sesión al volver a primer plano. |
| M2.8 | Registro y solicitud de recuperación devuelven `202`. La confirmación de registro devuelve `202` y el cambio de contraseña `200`. Son escrituras JSON sin Bearer. El perfil propio usa `GET/PATCH /me/profile`. La foto usa `GET/POST /me/photo` con Bearer, subida multipart en `photo` y descarga binaria. JPEG, PNG y WebP hasta 2 MiB. |
| M2.9–M3.0 | Reseñas públicas anónimas, reseñas propias con publicación tras servicio completado y retiro, categorías, búsqueda y servicios por prestador. |
| M3.1–M3.2 | El contexto comercial y la confirmación B2 siguen disponibles por HTTPS. `demo-checkout`, el comprobante ficticio y su estado solo se consultan con Expo en desarrollo, autorización explícita y API en loopback en la fixture local B3.2. |

El cliente requiere HTTPS en distribución y bloquea redirecciones. Envía Bearer a rutas privadas del origen configurado, omite cookies y descarga la foto por el cliente autenticado. Al cerrar sesión o recibir un 401 de la sesión actual, se descarta la credencial conforme al flujo existente. En Android, el almacenamiento usa SecureStore y reiniciar el proceso vuelve a solicitar el inicio de sesión.

Las distribuciones ignoran `EXPO_PUBLIC_ALLOW_LOCAL_HTTP` y `EXPO_PUBLIC_ENABLE_LOCAL_DEMO_CHECKOUT`. En staging la confirmación B2 usa la retención y el estado `ready` del servidor sin requisito sintético. Si aparece `web_checkout_required`, deja la reserva sin confirmar y registra el estado para el equipo web. Los pagos reales siguen deshabilitados.

## Auditoría de PR apiladas

El `master` consultado es `0a08076e80209dbfbaa475bd58d93313a0fc2013`, merge de la PR #8. Su segundo padre es `aed59fc9edaaf55ccb548f7ccf1a4c81b24ec3d1`. Las PR #2–7 aparecen abiertas en GitHub. Cada cabecera es ancestro de `master`, y `git rev-list --count master..<cabecera>` devolvió cero en los seis casos. No hace falta fusionarlas individualmente. Registrar la incorporación por #8 y decidir su cierre con los responsables. [PR #8](https://github.com/Jose5938/Tekora_movil/pull/8)

| PR | Cabecera revisada | Incremento |
| --- | --- | --- |
| [#2](https://github.com/Jose5938/Tekora_movil/pull/2) | `84bace48dcd2270fc3ea028a22f0488636f23188` | Solicitudes y seguimiento |
| [#3](https://github.com/Jose5938/Tekora_movil/pull/3) | `3e4c02061403348f0dc70b02983d783afd61436d` | Cotizaciones |
| [#4](https://github.com/Jose5938/Tekora_movil/pull/4) | `3cc4088612fd5cd6f115c9e92c590442b466e963` | Horarios y reservas |
| [#5](https://github.com/Jose5938/Tekora_movil/pull/5) | `399dd2f284366a5347e074589e567d8c554f96d4` | Confirmación B2 |
| [#6](https://github.com/Jose5938/Tekora_movil/pull/6) | `0fc2552aa3b3c6a98183a4b4aa258b6c313c87e3` | Mensajes y notificaciones |
| [#7](https://github.com/Jose5938/Tekora_movil/pull/7) | `859c194dcf3019c0e3faa8cca6e8948c2e72faeb` | Pulido y pruebas nativas |

## Preparar el dispositivo

Usa un checkout móvil independiente, Android SDK y un dispositivo de QA o emulador limpio. Staging debe proporcionar un certificado válido para el dominio, una cuenta de prestador y dos cuentas de solicitante sintéticas. Para validar registro y recuperación se necesita correo sintético que pueda recibir los códigos. El prestador actúa desde el entorno web de staging.

En PowerShell, sustituye el dominio por el autorizado antes de ejecutar los controles. El comando instala un build de comprobación local en el dispositivo seleccionado. Utiliza el identificador de paquete Android que apruebe el equipo si Expo lo solicita. [Compilación local con Expo](https://docs.expo.dev/guides/local-app-development/)

```powershell
npm ci
$env:EXPO_PUBLIC_API_BASE_URL = 'https://DOMINIO_AUTORIZADO/api/v1'
Remove-Item Env:EXPO_PUBLIC_ALLOW_LOCAL_HTTP, Env:EXPO_PUBLIC_ENABLE_LOCAL_DEMO_CHECKOUT -ErrorAction SilentlyContinue

$api = [Uri]$env:EXPO_PUBLIC_API_BASE_URL
if (-not $api.IsAbsoluteUri -or $api.Scheme -ne 'https' -or $api.AbsolutePath.TrimEnd('/') -ne '/api/v1' -or $api.UserInfo -or $api.Query -or $api.Fragment) {
    throw 'La URL debe ser HTTPS y terminar en /api/v1.'
}
$status = curl.exe --silent --show-error --fail --proto '=https' --max-time 15 --output NUL --write-out '%{http_code}' "$($api.AbsoluteUri.TrimEnd('/'))/categories"
if ($LASTEXITCODE -ne 0 -or $status -ne '200') {
    throw 'El catálogo de staging debe responder 200 directamente por HTTPS.'
}

adb devices -l
npx expo run:android --variant release --device
```

## Casos de aceptación en staging

| Caso | Resultado esperado |
| --- | --- |
| TLS y origen | Con el dominio aprobado, catálogo y login responden sin redirección. Un build de QA con HTTP rechaza el envío de credenciales. Un certificado inválido en un entorno de prueba controlado produce error de conexión con la confianza normal de Android. |
| Bearer y sesión | Iniciar sesión, enviar la app a segundo plano y verificar `/me` al volver. Revocar la sesión de QA y verificar que la app vuelve al login con 401. Repetir con cierre explícito y reinicio del proceso. |
| Registro y recuperación | Solicitar y pegar los códigos recibidos por correo. Registrar un solicitante nuevo, probar errores de código y repetición, cambiar contraseña e iniciar sesión con la nueva. Comprobar que el token anterior queda revocado y que el formulario de solicitud de correo muestra un mensaje genérico. |
| Foto y perfil | Editar el nombre. Seleccionar una foto sintética admitida desde el selector de Android. Reabrir Mi cuenta tras iniciar sesión de nuevo y comprobar que persiste. Probar cancelación del selector, formato inválido y archivo mayor a 2 MiB. La segunda cuenta ve su propio perfil y foto. |
| Catálogo y solicitud | Buscar por experto, abrir perfil y servicio, crear una solicitud, recibir la aceptación web y enviar un mensaje. Comprobar que la segunda cuenta recibe 404 al abrir la solicitud o sus mensajes. |
| Conversación y avisos | Abrir el aviso producido por una acción del prestador. Recorrer mensajes por cursor, marcar la página ya mostrada y comprobar que repetir un envío con su UUID conserva un solo mensaje. |
| Acuerdo y reserva | Emitir y aceptar cotización. Proponer horario, retener desde web y confirmar en Android durante los 900 segundos. Comprobar vencimiento, conflicto de versión, reintento sin duplicados y cancelación. |
| Aislamiento de B3.2 | En una cotización asociada a reserva y al abrir la ruta de pago directa, comprobar que no aparecen acciones de pago de prueba ni comprobantes ficticios. Verificar en los metadatos de acceso que el dispositivo hizo cero peticiones a `demo-checkout`. |
| Historial y reseña | Completar el servicio desde web, abrir el historial móvil, publicar la reseña, verificar que aparece sin datos del autor y retirarla. La segunda cuenta recibe 404 para el detalle privado. |

Registra el SHA, versión de Android y build, fecha, caso, ruta sin datos privados y estado HTTP. Usa capturas con datos sintéticos. Omite cabeceras de autorización, códigos, contraseñas y cuerpos de solicitudes en la evidencia.

## Validación local de la preparación

| Control | Resultado |
| --- | --- |
| `npm ci` | 809 paquetes, salida 0. |
| `npm test` | 82/82 con Node 22.13.0 y 82/82 con Node 24.22.1. |
| TypeScript con tipos de Expo, Expo lint y `git diff --check` | Salida 0. |
| Export Expo con URL HTTPS sintética | 20 rutas web y un bundle Android, salida 0. |
| `scripts/check-web.cjs` | 22 grupos en Chromium y cero errores de página. El transporte HTTPS simulado cubrió foto multipart y binaria, registro, recuperación, Bearer, rechazo de redirección y cero solicitudes a `demo-checkout`. |
| Prueba negativa de distribución en Chromium | Export web con URL HTTP de loopback y ambas banderas de laboratorio activas. El login mostró el requisito de HTTPS y emitió cero peticiones a la API. |

El export Android verifica la generación del bundle. Hasta que se habiliten la URL y las cuentas, quedan pendientes las pruebas de Android instalado, TLS en el dispositivo, correo de staging y recorrido contra la VPS.
