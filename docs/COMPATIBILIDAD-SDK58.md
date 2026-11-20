# Compatibilidad con Expo SDK 58

Revisión del 19 de noviembre de 2026 sobre `cc9334c6beb2f43501219ab75b11845076162c81`, en la rama del [PR #1 en borrador](https://github.com/Jose5938/Tekora_movil/pull/1).

## Resolución

La CLI en línea devolvió `HTTP Proxy Network Error: Forbidden` al ejecutar `npx expo install --check` sobre la base. Se consultó el código fuente de la documentación versionada porque `docs.expo.dev` también devolvió HTTP 403. La matriz `bundledNativeModules.json` del tarball publicado de Expo 58.0.26 coincide con los diez paquetes señalados en Windows. Tras instalar Expo 58.0.26, la comprobación con la matriz incluida detectó los otros nueve paquetes y `expo install --fix` los corrigió. [Referencia SDK 58](https://github.com/expo/expo/blob/sdk-58/docs/pages/versions/v58.0.0/index.mdx) · [Paquete publicado de Expo 58.0.26](https://registry.npmjs.org/expo/-/expo-58.0.26.tgz).

```sh
EXPO_OFFLINE=1 npx expo install 'expo@~58.0.26'
EXPO_OFFLINE=1 npx expo install --check
EXPO_OFFLINE=1 npx expo install --fix
```

| Dependencia | Instalada antes | Rango final | Instalada después |
| --- | --- | --- | --- |
| `expo` | 58.0.22 | ~58.0.26 | 58.0.26 |
| `@expo/ui` | 58.0.26 | ~58.0.29 | 58.0.29 |
| `expo-linking` | 58.0.15 | ~58.0.17 | 58.0.17 |
| `expo-router` | 58.0.29 | ~58.0.32 | 58.0.32 |
| `expo-secure-store` | 58.0.2 | ~58.0.3 | 58.0.3 |
| `expo-splash-screen` | 58.0.12 | ~58.0.14 | 58.0.14 |
| `expo-status-bar` | 58.0.4 | ~58.0.5 | 58.0.5 |
| `expo-symbols` | 58.0.4 | ~58.0.5 | 58.0.5 |
| `expo-web-browser` | 58.0.7 | ~58.1.0 | 58.1.0 |
| `react-native-safe-area-context` | 5.10.1 | ~5.11.1 | 5.11.1 |

Los otros paquetes directos retienen sus versiones instaladas y rangos. El lockfile refleja la resolución transitiva de Expo y sus módulos, Babel y la fuente de símbolos. La CLI agregó automáticamente plugins de configuración de StatusBar y WebBrowser. Se retiraron esas dos entradas porque el ajuste se limita a dependencias y la app no solicita nuevas opciones de esos plugins. Se conservó la configuración existente de SecureStore y SplashScreen. [Opciones de WebBrowser](https://github.com/expo/expo/blob/sdk-58/docs/pages/versions/v58.0.0/sdk/webbrowser.mdx) · [Opciones de StatusBar](https://github.com/expo/expo/blob/sdk-58/docs/pages/versions/v58.0.0/sdk/status-bar.mdx).

## Aplicación y seguridad

Se revisaron `src/app/_layout.tsx`, las pantallas que usan las zonas seguras, el enlace externo y los adaptadores de sesión. La navegación sigue usando `Stack.Protected` con el estado de sesión. El adaptador nativo conserva las mismas claves, accesibilidad y llamadas `getItemAsync`, `setItemAsync` y `deleteItemAsync`. Los archivos publicados `SecureStore.js` y `SecureStore.d.ts` son idénticos entre 58.0.2 y 58.0.3. En los directorios nativos del paquete, la única diferencia observada fue la versión en `android/build.gradle`. La sesión web conserva el adaptador en memoria. Safe Area Context afecta los márgenes en navegación y catálogo, y WebBrowser el enlace externo nativo. Queda pendiente comprobar esas superficies, el splash, enlaces profundos y la persistencia de una sesión existente en Android/iOS con un cliente compatible. [Documentación de SecureStore](https://github.com/expo/expo/blob/sdk-58/docs/pages/versions/v58.0.0/sdk/securestore.mdx).

Se conservaron `shell-quote@1.12.0`, `node-forge@1.4.3`, `@expo/cli@58.1.21`, `@expo/fingerprint@0.21.10` y TypeScript ESLint 8.73.0 con `minimatch@11.0.9`. El único aviso residual se propaga por `expo@58.0.26 → @expo/fingerprint@0.21.10 → minimatch@10.2.6`. Fingerprint usa minimatch para cotejar rutas e ignorados en herramientas de build y admite `^10.2.6`, que excluye la corrección oficial 11.0.1. Un patrón manipulado puede agotar CPU o memoria en los modos de optimización afectados. Ambas auditorías marcan los mismos tres paquetes. Se conserva el SDK 58 sin overrides ni la degradación a Expo 52.0.49 que propone npm. [Aviso oficial de minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249).

## Validación de la resolución final

Linux con Node 24.22.1 y npm 11.9.0 para los comandos generales. El ejecutor también se probó con Node 22.13.0.

| Comando | Salida | Resultado |
| --- | --- | --- |
| `npm ci` | 0 | 806 paquetes instalados. Aviso de deprecación de ESLint 9.39.5 |
| `npm test` (Node 22.13.0) | 0 | 29/29, sin fallos, cancelaciones ni omisiones |
| `npm test` (Node 24.22.1) | 0 | 29/29, sin fallos, cancelaciones ni omisiones |
| `npx tsc --noEmit` | 0 | Después de generar `expo-env.d.ts` y `.expo/types/router.d.ts` con Expo |
| `npx expo lint` | 0 | Sin diagnósticos |
| `npx expo install --check` | 1 | Consulta remota bloqueada con `HTTP Proxy Network Error: Forbidden` |
| `EXPO_OFFLINE=1 npx expo install --check` | 0 | `Dependencies are up to date` con la matriz de Expo 58.0.26 incluida en el paquete |
| `npx expo-doctor --verbose` (1.21.8) | 1 | 18/20. La comprobación de versiones del SDK pasó |
| `npm audit` | 1 | 3 moderadas, 0 críticas, altas o bajas |
| `npm audit --omit=dev` | 1 | 3 moderadas, 0 críticas, altas o bajas |
| `npx expo export --platform web` | 0 | 14 rutas estáticas. Exportación local con la URL de fixtures |
| `node scripts/check-web.cjs` | 0 | 9 grupos de controles con Playwright 1.57.0 y Chromium 155.0.8059.79, sin errores JavaScript de página |
| `npm ls --all` y `git diff --check` | 0 | Árbol válido y diff limpio |

Expo Doctor se ejecutó con sus comprobaciones remotas habilitadas. El esquema de configuración devolvió `TypeError: fetch failed` y `Error: getaddrinfo EAI_AGAIN exp.host`. React Native Directory devolvió `Directory check failed with unexpected server response`. Queda pendiente repetir ambas consultas con conectividad y validar la app con un cliente nativo del SDK 58. Las pruebas de esta revisión se ejecutaron en Linux.
