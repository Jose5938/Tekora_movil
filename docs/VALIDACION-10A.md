# Validación de Etapa 10A

Este informe conserva los resultados originales de la integración. La revisión posterior del ejecutor para Node 22/24 y de las vulnerabilidades, con los comandos repetidos y las cifras actuales, está en [SEGURIDAD-10A.md](SEGURIDAD-10A.md).

Ejecutada el 5 de noviembre de 2026 en Linux, Node **24.22.1**, npm **11.9.0**, Expo SDK **58**. Código móvil en `codex/tekora-movil-etapa-10a`; base `ddc4d4e0815ac18152b1ed36278fe1d317a25edc`. El SHA final y la URL se registran en la entrega del PR.

## Resultados originales ejecutados

| Comando/control | Resultado |
| --- | --- |
| `npm ci` con el lockfile final | **0**; instalación limpia, 810 paquetes; aviso de deprecación de ESLint 9.39.5 |
| `npx tsc --noEmit` | **0**, sin errores |
| `npx expo lint` | **0**, sin errores ni advertencias de lint |
| `npm test` | **0**, **29 pruebas**, 29 pasan, 0 fallan, 0 omitidas |
| `npx expo-doctor` | **1**, **18/20** comprobaciones pasan; dos controles remotos no completados por la red |
| `npx expo export --platform web` | **0**, exportación estática de la app existente |
| `node scripts/check-web.cjs` con Playwright/Chromium | **0**, **9 grupos de controles**, sin errores JavaScript de página; viewport móvil 390 × 844 |
| `git diff --check` | **0**, sin errores de espacios |
| Comparación del lockfile | 257 entradas añadidas; ninguna entrada preexistente cambia de versión |

El primer `npm ci` falló por restricción de red del sandbox. Se repitió con acceso al registro npm y terminó correctamente, tanto antes como después de añadir dependencias. Expo CLI también intentó escribir su caché fuera del workspace; se redirigió su directorio de trabajo al área temporal y se desactivó telemetría. Estos ajustes son solo del proceso de validación y no se añadieron a la configuración de la app.

La instalación con `npx expo install` terminó usando el mapa local de versiones de Expo 58 (`EXPO_OFFLINE=1`), ya que su servicio de compatibilidad no estaba disponible. Lint se ejecutó con esa misma modalidad para evitar consultas externas innecesarias. No se desactivaron reglas ni se excluyeron archivos de aplicación para obtener el resultado.

### Expo Doctor: límite de red pendiente

Salida relevante de la ejecución con red habilitada:

```text
Running 20 checks on your project...
Unexpected error while running 'Check Expo config (app.json/ app.config.js) schema' check:
TypeError: fetch failed
Error: getaddrinfo EAI_AGAIN exp.host
This check requires a connection to the Expo API. Ensure your network connection is stable.
Warning: Could not fetch bundled native modules
18/20 checks passed. 2 checks failed.

✖ Check Expo config (app.json/ app.config.js) schema
✖ Validate packages against React Native Directory package metadata
Directory check failed with unexpected server response
```

No se presenta como una verificación completa. Repetir `npx.cmd expo-doctor` en Windows con acceso a los servicios de Expo y React Native Directory. No se cambió la política de red ni se omitieron esas comprobaciones en la configuración del proyecto.

## Cobertura automatizada

`npm test` compila el núcleo TypeScript HTTP/sesión a una carpeta temporal. El ejecutor actual carga cada archivo de pruebas directamente con Node, que ejecuta `node:test`, sin argumentos específicos de versión. Sustituye el uso original de `--test-isolation=none`, incompatible con Node 22.13.0. Se verificaron 29/29 en Node 22.13.0 y Node 24.22.1; ver [revisión del ejecutor](SEGURIDAD-10A.md#ejecutor-de-pruebas). No requiere una base de datos, credenciales reales ni un servidor remoto.

Las 29 pruebas verifican: login correcto e incorrecto; cuerpo y Bearer según operación; doble pulsación; contexto global de fetch; expiración durante guardado; restauración bloqueada hasta `/me`; expiración al abrir y con sesión activa; expiración mientras llega `/me`; 401 JSON y no JSON; revocación durante sesión; logout y logout sin conexión; acceso sin token; catálogo público vacío; 404; interpretación de 401/403/404/409/422/429 y campos/Retry-After; pérdida de conexión y reintento; permisos revocados; revalidación; credencial corrupta; fallos al guardar o borrar de almacenamiento seguro; deduplicación de GET y separación de POST distintos; configuración inválida; IDs de navegación; ausencia de logs y almacenamiento inseguro en código de autenticación.

El almacenamiento se sustituye por un adaptador en memoria en estas pruebas. La inspección de código verifica el uso de SecureStore en nativo, pero no demuestra ejecución del Keychain o Keystore en un dispositivo real.

### Navegador con contrato simulado

El script [check-web.cjs](../scripts/check-web.cjs) sirve la exportación local y sustituye las respuestas HTTP por fixtures de OpenAPI, sin datos reales. Comprueba:

1. Enlaces directos a cuenta, chat, reserva y pago sin sesión: login sin identidad privada.
2. Validación local; login 401, 422 por campo y 429.
3. Login correcto, inicio con identidad y prestadores; localStorage, sessionStorage y cookies vacíos.
4. Perfil por `/providers/7` y explicación de solicitud en preparación.
5. Catálogo y detalle por `/services/21`, con campos del contrato.
6. 404, catálogo vacío, pérdida de conexión y reintentos.
7. Chat, reserva y pago sin acciones reales; perfil de cuenta y POST logout con Bearer.
8. Expiración de una sesión corta con la pantalla abierta.
9. Recarga de la vista web exige login; catálogo nunca envía Bearer; sin errores de página.

Evidencia con nombres, correo y mensajes **sintéticos**:

- [Login con error](evidence/10a/login-error.png)
- [Inicio y prestadores](evidence/10a/inicio-catalogo.png)
- [Detalle del servicio](evidence/10a/detalle-servicio.png)
- [Pago deshabilitado](evidence/10a/pagos-en-preparacion.png)
- [Cuenta](evidence/10a/cuenta.png)
- [Resultados y métodos/rutas solicitados](evidence/10a/results.json); registra solo presencia de Bearer, nunca su contenido.

Para repetir esta comprobación opcional en Windows, instalar Playwright en una carpeta de herramientas independiente e ignorada por Git. No añade una dependencia a la app ni cambia su lockfile:

```powershell
New-Item -ItemType Directory -Force .\work\browser-tools | Out-Null
npm.cmd install --prefix .\work\browser-tools playwright
.\work\browser-tools\node_modules\.bin\playwright.cmd install chromium
$env:TEKORA_PLAYWRIGHT_PATH = (Resolve-Path .\work\browser-tools\node_modules\playwright).Path
$env:EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:18013/api/v1'
npx.cmd expo export --platform web --output-dir work/10a-web-preview
node .\scripts\check-web.cjs
Remove-Item Env:EXPO_PUBLIC_API_BASE_URL
Remove-Item Env:TEKORA_PLAYWRIGHT_PATH
```

Usar los puertos 18080 y 18013 libres. La dirección 127.0.0.1 es exclusivamente del ensayo de navegador en el mismo equipo: **no** es la configuración para el teléfono físico. Las peticiones a 18013 son interceptadas por el script; no arranca un Laravel falso ni contacta otro backend. Capturas y resultados nuevos quedan en `work/10a-browser-evidence`, fuera del seguimiento Git.

## Riesgos y pendientes

- No se ejecutó la app en Android/iOS, Expo Go, emulador ni teléfono físico. Falta comprobar SecureStore real, arranque/restauración nativa, deep links, suspensión y retorno a primer plano, teclado y disposición en distintos tamaños.
- No se probó una instancia Laravel real accesible. Los transportes simulados verifican el cliente y la interfaz; falta la validación de extremo a extremo en la LAN aislada con la API 9B. Seguir [ETAPA-10A.md](ETAPA-10A.md).
- Doctor requiere completar dos comprobaciones remotas. npm advierte que la línea ESLint 9.39.5 está deprecada; se usó la versión resuelta por Expo para esta configuración y no se alteraron librerías existentes para una actualización mayor de herramientas.
- Un logout sin red elimina la sesión local y avisa que la revocación no se confirmó. El token servidor podría seguir válido hasta caducar o revocarse; no se afirma lo contrario.
- La vista web solo conserva sesión en memoria. La persistencia de sesión exigida se implementa en Android/iOS mediante SecureStore.
- La API no entrega precios, distancias, reputación, verificación ni fotografías. La UI no los inventa. Reseñas, favoritos, historial, edición de cuenta, Google/Apple/registro, chat, publicación, reserva y pagos siguen pendientes de contratos posteriores.
- El PR permanece en borrador, sin merge, despliegue, cambios de backend o credenciales reales. Se espera revisión independiente de ChatGPT y aprobación del usuario.
