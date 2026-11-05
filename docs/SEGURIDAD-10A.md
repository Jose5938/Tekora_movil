# PR #1 — compatibilidad Node 22/24 y dependencias

Revisión del 5 de noviembre de 2026 sobre `fd672e51f2f7fd76b1e7c16341d96f4f40e2bbf4`, en la misma rama `codex/tekora-movil-etapa-10a` y el [PR #1](https://github.com/Jose5938/Tekora_movil/pull/1). El SHA de entrega se registra en el PR. Permanece en borrador para revisión independiente; no hubo merge ni despliegue.

Se reprodujo la validación de Windows comunicada por el usuario: antes del cambio, `npm audit` informa 16 paquetes vulnerables (15 moderados y 1 crítico), y `npm audit --omit=dev`, 9 (8 moderados y 1 crítico). Después quedan **12 moderados en total, 5 al omitir desarrollo, y cero críticos o altos**. Son dos avisos directos (`glob` y `minimatch`) y sus efectos sobre los paquetes que los incluyen, no doce fallos independientes.

No se modificaron `package.json`, `app.json`, `src/`, `tests/`, diseño, autenticación, SecureStore o contratos Laravel. Expo sigue en **58.0.22**, React Native en **0.88.1**, Router en **58.0.29** y SecureStore en **58.0.2**. No se añadieron dependencias directas, overrides, exclusiones de auditoría, credenciales ni cambios al backend.

## Ejecutor de pruebas

`scripts/test-api.cjs` compila el núcleo a una carpeta temporal y ejecuta cada archivo `*.test.cjs` directamente mediante `process.execPath`. `node:test` registra y ejecuta sus pruebas al cargar el archivo, sin necesitar `--test` o `--test-isolation=none`. Así se evita el argumento no disponible en Node 22.13.0 y el resultado engañoso de un único archivo sin subtests que se observó con `--test` en el Node 24 de este entorno.

Cada archivo tiene un proceso separado. El script ordena los archivos, rechaza una lista vacía, propaga el fallo del proceso hijo y elimina el directorio temporal incluso si falla la compilación o un test. No se cambió ni omitió ninguna de las 29 pruebas.

- Linux, Node **22.13.0**: `npm test`, salida **0**, **29/29**, 0 fallos, cancelaciones u omisiones.
- Linux, Node **24.22.1**: `npm test`, salida **0**, **29/29**, 0 fallos, cancelaciones u omisiones.
- Ocho controles adicionales en fixtures aislados: en cada Node se comprobó suite correcta (0), test fallido (1), compilación fallida (1) y ausencia de archivos de test (1); la carpeta temporal se eliminó en los ocho casos. [Evidencia](evidence/10a-security/runner-checks.json).

El usuario ya comprobó en Windows las 29 pruebas ejecutadas directamente con Node 22.13.0. La ejecución del wrapper modificado se verificó aquí en Linux, con ambas versiones; no se presenta como una nueva ejecución de Windows. Referencia: [documentación de node:test para Node 22.13.0](https://nodejs.org/download/release/v22.13.0/docs/api/test.html).

## Corrección crítica: shell-quote

Ruta instalada antes:

```text
react-native@0.88.1
└─ react-devtools-core@6.1.5
   └─ shell-quote@1.10.0  (rango solicitado: ^1.6.1)
```

[GHSA-pqg4-j6r4-53mv / CVE-2026-102422](https://github.com/advisories/GHSA-pqg4-j6r4-53mv) afecta `>=1.8.4 <1.11.0`. Una cadena con terminador de línea después de un token de comentario puede escapar del comentario en `quote()`; si el resultado se ejecuta en un shell, puede inyectar comandos. La corrección oficial empieza en **1.11.0**.

El lockfile actual resuelve **shell-quote 1.12.0**, última versión estable publicada consultada y aceptada por `^1.6.1`. No se añadió como dependencia directa ni se forzó su versión con overrides. Se conserva `react-devtools-core 6.1.5` y React Native. [Release oficial 1.12.0](https://github.com/ljharb/shell-quote/releases/tag/v1.12.0).

Además de las auditorías se comprobó que `quote()` rechaza con `TypeError` los cuatro terminadores `\n`, `\r`, U+2028 y U+2029 después de un comentario, y que el entrecomillado ordinario conserva su resultado. Solo se evaluó `quote()`; **no se ejecutaron comandos de la prueba en un shell**.

## Actualizaciones compatibles de los paquetes originales

Se consultaron las dependencias publicadas en npm y las releases oficiales. Se actualizó únicamente el conjunto transitivo necesario dentro de los rangos ya declarados:

```sh
npm update shell-quote @expo/config @expo/config-plugins @expo/metro-config @expo/cli --package-lock-only --ignore-scripts
npm ci
```

La primera operación solo recalculó el lockfile. `npm ci` hizo después una instalación completa con scripts normales. No se usó `npm audit fix`, `--force`, `--legacy-peer-deps`, versiones canary, ni una degradación de Expo. `package.json` y la entrada raíz del lockfile permanecen iguales.

| Paquete | Antes → después | Motivo |
| --- | --- | --- |
| `shell-quote` | 1.10.0 → **1.12.0** | Corrección crítica dentro de `^1.6.1` |
| `@expo/config` | 58.0.10 → **58.0.11** | Elimina `glob`; usa un recorrido propio del proyecto |
| `@expo/config-plugins` | 58.0.11 → **58.0.12** | Sustituye `glob` por tinyglobby y comprobaciones de rutas |
| `@expo/metro-config` | 58.0.20 → **58.0.21** | Sustituye `glob` por Node glob y tinyglobby |
| `@expo/cli` | 58.1.18 → **58.1.19** | Necesario para dejar de fijar exactamente metro-config 58.0.20; fija 58.0.21 |
| `@expo/router-server` | 58.0.20 → **58.0.21** | Requerido por CLI 58.1.19 |
| `@expo/env` | 2.5.3 → **2.5.4** | Dependencia requerida por los parches oficiales |
| `@expo/inline-modules` | 0.2.8 → **0.2.9** | Dependencia requerida por CLI 58.1.19 |
| `@expo/log-box` | 58.0.14 → **58.0.15** | Dependencia requerida por CLI 58.1.19 |
| `@expo/metro-runtime` | 58.0.16 → **58.0.17** | Peer requerido por router-server 58.0.21 |
| `@expo/prebuild-config` | 58.0.18 → **58.0.19** | Dependencia requerida por CLI 58.1.19 |
| `expo-constants` | 58.0.14 → **58.0.15** | Peer `^58.0.15` requerido por router-server 58.0.21; satisface el `~58.0.14` existente |
| `expo-modules-autolinking` | 58.0.16 → **58.0.17** | Requerido por prebuild-config 58.0.19 |

`expo-constants` es la única dependencia directa cuya resolución instalada cambia; su declaración en `package.json` no cambia. Es consecuencia del peer obligatorio de router-server, no una actualización general de librerías. La revisión nativa debe usar un cliente compatible con ese parche; no se construyó un binario ni se modificaron directorios nativos.

npm reubica CLI/router-server y algunos auxiliares al nivel raíz de `node_modules`, y deduplica `ci-info`. La [comparación completa del lockfile](evidence/10a-security/lockfile-changes.json) enumera las 13 actualizaciones de versión y esas ubicaciones. No son cambios manuales al lockfile.

Releases consultadas: [config 58.0.11](https://github.com/expo/expo/releases/tag/%40expo%2Fconfig%4058.0.11), [config-plugins 58.0.12](https://github.com/expo/expo/releases/tag/%40expo%2Fconfig-plugins%4058.0.12), [metro-config 58.0.21](https://github.com/expo/expo/releases/tag/%40expo%2Fmetro-config%4058.0.21), [CLI 58.1.19](https://github.com/expo/expo/releases/tag/%40expo%2Fcli%4058.1.19).

También se verificó [Expo 58.0.23](https://github.com/expo/expo/releases/tag/expo%4058.0.23), disponible en npm. Actualiza varios paquetes nativos y sigue dependiendo de CLI/fingerprint con los rangos residuales descritos abajo. No es necesario cambiar el paquete directo Expo para instalar los parches transitivos anteriores; hacerlo no resolvería las dos familias de avisos restantes. No se actualizó a otra versión de SDK.

## Vulnerabilidades moderadas residuales

### Glob — GHSA-3g3m-2fjr-6pw4

[Advisory oficial / CVE-2026-118773](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4): `glob >=9.0.0 <=14.0.1` puede continuar recorriendo directorios tras cancelar la operación con AbortSignal. El impacto es consumo de CPU y E/S después de la cancelación. La corrección oficial comienza en **14.0.2**; la última estable consultada es **14.0.3**.

Se conserva `glob 13.0.6`, en `node_modules/glob`, por estas rutas exactas:

```text
expo@58.0.22 → @expo/cli@58.1.19 → glob@13.0.6
expo@58.0.22 → @expo/fingerprint@0.21.8 → glob@13.0.6
```

CLI **58.1.19**, la última estable consultada de SDK 58, sigue solicitando `glob ^13.0.0`. Fingerprint **0.21.9**, última estable consultada, también sigue solicitando `glob ^13.0.0`; actualizar desde 0.21.8 no elimina este aviso. Ninguno acepta glob 14 sin cambiar su contrato de dependencia. Por eso no se sustituyó globalmente glob 13 por 14 mediante overrides. Los tres paquetes config/config-plugins/metro-config sí publicaron sustituciones compatibles y esas rutas se eliminaron.

Se inspeccionó el código instalado: CLI usa glob para archivos/rutas del proyecto, exports y tareas nativas; `build/src/utils/glob.js` usa `globStream` con AbortController. Fingerprint lo usa para detectar archivos del proyecto. Estas operaciones ocurren en herramientas Node del equipo de desarrollo/build. Un árbol de archivos o patrones problemáticos puede agotar recursos de esas herramientas. No se demostró explotación en esta app ni se presenta el aviso como inocuo.

### Minimatch — GHSA-g3hv-75wg-m249

[Advisory oficial / CVE-2026-118764](https://github.com/advisories/GHSA-g3hv-75wg-m249): afecta `>=7.0.0 <11.0.1`. Un patrón controlado por un atacante puede amplificar `globParts` y provocar consumo excesivo de CPU/memoria cuando se usa optimización de nivel 2 o superior. Corrección desde **11.0.1**; última estable consultada **11.0.4**.

Se conserva `minimatch 10.2.6`, en `node_modules/minimatch`. Rutas de producción según el manifiesto:

```text
expo@58.0.22 → @expo/cli@58.1.19 → glob@13.0.6 → minimatch@10.2.6
expo@58.0.22 → @expo/fingerprint@0.21.8 → glob@13.0.6 → minimatch@10.2.6
expo@58.0.22 → @expo/fingerprint@0.21.8 → minimatch@10.2.6
```

Rutas adicionales de desarrollo, todas con `eslint-config-expo@58.0.4` como raíz y paquetes TypeScript ESLint **8.72.1**:

```text
eslint-config-expo → @typescript-eslint/parser → @typescript-eslint/typescript-estree → minimatch@10.2.6
eslint-config-expo → @typescript-eslint/eslint-plugin → @typescript-eslint/type-utils → @typescript-eslint/typescript-estree → minimatch@10.2.6
eslint-config-expo → @typescript-eslint/eslint-plugin → @typescript-eslint/type-utils → @typescript-eslint/utils → @typescript-eslint/typescript-estree → minimatch@10.2.6
eslint-config-expo → @typescript-eslint/eslint-plugin → @typescript-eslint/utils → @typescript-eslint/typescript-estree → minimatch@10.2.6
eslint-config-expo → eslint-plugin-expo@1.2.1 → @typescript-eslint/utils → @typescript-eslint/typescript-estree → minimatch@10.2.6
```

Glob 13.0.6, fingerprint 0.21.8 y su última estable 0.21.9, y TypeScript ESTree **8.72.1** (última estable consultada) solicitan `minimatch ^10.2.2`. No aceptan el parche 11.x. ESLint config Expo **58.0.4** sigue siendo la última estable consultada. No se aplicó un cambio mayor global ni se sustituyó por una configuración antigua para reducir artificialmente la auditoría. Las copias de minimatch 3.1.5 usadas por otras herramientas quedan fuera del rango de este aviso específico.

El código inspeccionado de fingerprint hace matching de rutas/ignorados; TypeScript ESTree usa minimatch para `allowDefaultProject`. No se observó una opción explícita `optimizationLevel: 2` en esas llamadas inspeccionadas. Esto limita lo demostrado sobre alcanzabilidad, pero no prueba ausencia de riesgo en todas las herramientas, configuraciones o patrones. Se conserva el aviso íntegro en las auditorías.

### Interpretación de los conteos

`npm audit --omit=dev` conserva cinco paquetes marcados: **expo, @expo/cli, @expo/fingerprint, glob y minimatch**. La auditoría completa añade siete de desarrollo: **eslint-config-expo, eslint-plugin-expo, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, @typescript-eslint/type-utils, @typescript-eslint/typescript-estree y @typescript-eslint/utils**.

El grupo de producción se clasifica por `dependencies` del manifiesto: Expo incluye sus herramientas CLI/fingerprint allí. El conteo no demuestra por sí solo que esos paquetes se ejecuten en un binario móvil. `src/` no importa glob/minimatch/shell-quote y no se encontró una ruta desde entradas de login/catálogo de la app hacia estas funciones Node. Tampoco se hizo un análisis de un binario Android/iOS, por lo que no se afirma que todo riesgo esté descartado.

Estado oficial al consultar npm: existen correcciones en glob 14.0.2+ y minimatch 11.0.1+, pero faltan releases estables de los padres mencionados que las admitan o reemplacen. Se deben repetir las consultas y auditorías cuando se publiquen. La recomendación automática de npm propone Expo **52.0.49** y/o ESLint config Expo **6.0.0** con cambios incompatibles; **no se aplicó**. No se desactivaron auditorías ni se cambió su umbral de severidad.

## Verificaciones ejecutadas

Linux, npm **11.9.0**, Node **24.22.1**, con segunda ejecución de `npm test` en Node **22.13.0**. Las auditorías se ejecutaron también en formato JSON para conservar la evidencia. `npm ci` usa el lockfile final, sin edición posterior de dependencias.

| Comando/control | Salida | Resultado |
| --- | --- | --- |
| `npm ci` | **0** | 809 paquetes; aviso heredado de deprecación de ESLint 9.39.5 |
| `npm test`, Node 22.13.0 | **0** | 29 pruebas, 29 pasan, 0 fallan/canceladas/omitidas |
| `npm test`, Node 24.22.1 | **0** | 29 pruebas, 29 pasan, 0 fallan/canceladas/omitidas |
| `npx tsc --noEmit` | **0** | Sin errores de tipos; Expo ya había generado `expo-env.d.ts` |
| `npx expo lint` | **0** | Sin errores ni avisos de lint |
| `npx expo-doctor` | **1** | 18/20; esquema remoto Expo y React Native Directory no accesibles |
| `npm audit` | **1** | 12 moderadas; 0 críticas/altas/bajas |
| `npm audit --omit=dev` | **1** | 5 moderadas; 0 críticas/altas/bajas |
| `npx expo export --platform web` | **0** | Exportación correcta tras actualizar Metro/config; se usó EXPO_OFFLINE=1 para este control |
| `node scripts/check-web.cjs` | **0** | 9 grupos con respuestas OpenAPI sintéticas; sin errores JavaScript de página |
| Control shell-quote | **0** | Rechaza cuatro terminadores peligrosos; quoting ordinario correcto |
| Fixtures del ejecutor | **0** | Ocho escenarios con códigos de salida y limpieza esperados |

Doctor se ejecutó con red habilitada. Su salida conserva `getaddrinfo EAI_AGAIN exp.host`, fallo de consulta del esquema y respuesta remota inesperada de React Native Directory. No se omitieron checks ni se cambió su configuración para presentar 20/20. Repetir con conectividad a esos servicios. Expo CLI usa un directorio de caché temporal dentro del workspace y telemetría desactivada; esto no modifica la app ni sus auditorías.

No se ejecutaron Windows, un teléfono/emulador, un build nativo ni una instancia Laravel real en esta revisión. La comprobación web usa datos sintéticos y no prueba Keystore/Keychain nativos. El parche de expo-constants y las verificaciones remotas pendientes requieren revisión independiente. No se alteró la implementación de SecureStore.

### Reproducción Windows

En el mismo PR y con Node 22.13.0 o Node 24.22.1:

```powershell
git switch codex/tekora-movil-etapa-10a
git pull --ff-only
node --version
npm.cmd ci
# En un clon nuevo, arrancar Expo una vez y detener con Ctrl+C cuando genere
# expo-env.d.ts y .expo/types. Son archivos generados e ignorados por Git.
npx.cmd expo start --offline
npm.cmd test
npx.cmd tsc --noEmit
npx.cmd expo lint
npx.cmd expo-doctor
npm.cmd audit
npm.cmd audit --omit=dev
git status --short
```

Si `expo-env.d.ts` ya existe, no hace falta ese arranque de inicialización. No editarlo ni versionarlo; ver [tipos generados de Expo Router](https://docs.expo.dev/router/reference/typed-routes/). Los códigos 1 de las auditorías son los residuos documentados, no resultados aprobados. El código de Doctor debe interpretarse junto a sus mensajes reales en cada entorno.

## Evidencia para revisión

- [Auditoría completa antes](evidence/10a-security/audit-before.json) y [después](evidence/10a-security/audit-after.json).
- [Auditoría sin desarrollo antes](evidence/10a-security/audit-production-before.json) y [después](evidence/10a-security/audit-production-after.json).
- [Salida de npm audit](evidence/10a-security/npm-audit.log) y [npm audit --omit=dev](evidence/10a-security/npm-audit-omit-dev.log), con recomendaciones incompatibles preservadas para revisión.
- [Manifiestos/estado publicado consultado](evidence/10a-security/registry-status.json), [cambios del lockfile](evidence/10a-security/lockfile-changes.json) y [todas las rutas de dependencias directas/optativas relevantes](evidence/10a-security/dependency-paths.json). Estas rutas no expanden enlaces peer recursivos; el peer obligatorio de constants se documenta arriba.
- [npm ci](evidence/10a-security/npm-ci.log), [tests Node 22](evidence/10a-security/npm-test-node22.log), [tests Node 24](evidence/10a-security/npm-test-node24.log) y [Expo Doctor](evidence/10a-security/expo-doctor.log).
- [Resumen de códigos de salida](evidence/10a-security/verification.json) y [resultados de navegador](evidence/10a-security/browser-results.json).

Estas evidencias contienen versiones, rutas y datos de prueba sintéticos; no contienen tokens ni contraseñas reales.
