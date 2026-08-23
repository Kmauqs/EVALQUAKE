# EVALQUAKE

**Versión actual: [0.14.1](CHANGELOG.md)**

![alt](https://github.com/Kmauqs/EVALQUAKE/blob/main/icon_512.png)

Evaluación rápida de daños en edificaciones, bilingüe (español/inglés) y offline-first para Android, iOS y web. Sigue `ARCHITECTURE.md` y usa `icon_960.png` como icono, favicon, splash y base visual.

Sitio de producción: [https://evalquake.web.app](https://evalquake.web.app)

## Interfaz de usuario:
<img src="https://github.com/Kmauqs/EVALQUAKE/blob/main/assets/readme/Screenshot_20260823_110020_Chrome.jpg" width="50%"> <img src="https://github.com/Kmauqs/EVALQUAKE/blob/main/assets/readme/Screenshot_20260823_110104_Chrome.jpg" width="50%"> <img src="https://github.com/Kmauqs/EVALQUAKE/blob/main/assets/readme/Screenshot_20260823_110113_Chrome.jpg" width="50%"> <img src="https://github.com/Kmauqs/EVALQUAKE/blob/main/assets/readme/Screenshot_20260823_110144_Chrome.jpg" width="50%"> <img src="https://github.com/Kmauqs/EVALQUAKE/blob/main/assets/readme/Screenshot_20260823_110153_Chrome.jpg" width="50%"> <img src="https://github.com/Kmauqs/EVALQUAKE/blob/main/assets/readme/Screenshot_20260823_110202_Chrome.jpg" width="50%"> <img src="https://github.com/Kmauqs/EVALQUAKE/blob/main/assets/readme/Screenshot_20260823_120550_Chrome.jpg" width="50%">

## Panel de Coordinación y Administración
![alt](https://github.com/Kmauqs/EVALQUAKE/blob/main/assets/readme/Coordination_2026-08-23%20120928.png)
![alt](https://github.com/Kmauqs/EVALQUAKE/blob/main/assets/readme/Coordination_2026-08-23%20121009.png)

## Versionado

A partir de **0.2.0** cada entrega se registra en [`CHANGELOG.md`](CHANGELOG.md) con Semantic Versioning (`MAJOR.MINOR.PATCH`).

La misma versión debe coincidir en:

| Archivo | Campo |
|---|---|
| `src/version.ts` | `APP_VERSION` (se muestra en la cabecera de la app) |
| `package.json` | `version` |
| `app.json` | `expo.version` |
| `functions/package.json` | `version` |

Al cerrar un conjunto de cambios: subir el número, anotar la bitácora y seguir [`DEPLOY.md`](DEPLOY.md).

## Qué incluye 0.2.0

- Una app Expo Router + TypeScript para Android, iOS y web responsive.
- Flujo resumible de 17 secciones (modelo 2B/ATC-20).
- Borradores locales y cola de salida: SQLite en móvil, persistencia del navegador en web.
- GPS, cámara/galería (varias fotos), compresión, croquis por imagen y firma en modal fijo.
- PDF bilingüe local inmediato y PDF canónico en Firebase (consecutivo oficial).
- Envío inmutable: una evaluación enviada no se sobrescribe.
- Panel de coordinación: filtros, mapa con gestos/ubicación, detalle y exportaciones CSV/JSON.
- Autenticación por correo: el usuario crea su cuenta y un **admin** la aprueba, asigna rol y jurisdicción.
- Roles `evaluator`, `coordinator` y `admin`.

Sin variables Firebase el cliente arranca en **modo demostración** (datos ficticios, solo en el dispositivo).

## Ejecutar en local

Requisitos: Node.js 22+, npm, y Expo Go o un simulador Android/iOS.

```bash
npm install
npm start
```

Luego `a` (Android), `i` (iOS, macOS/Xcode) o `w` (web). El control `EN` / `ES` del encabezado cambia el idioma y se guarda en el dispositivo.

## Firebase (desarrollo)

No se suben credenciales. Copie `.env.example` a `.env` o `.env.local` con los valores del proyecto (hoy `evalquake`) y, solo en local:

```dotenv
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true
```

```bash
npm --prefix functions install
npm --prefix functions run build
npx firebase emulators:start
```

Puertos: UI `4000`, Hosting `5000`, Functions `5001`, Firestore `8080`, Auth `9099`, Storage `9199`. Android usa `10.0.2.2`; iOS y web, `127.0.0.1`.

## Usuarios y roles

1. El usuario crea la cuenta en la pantalla de inicio.
2. Queda **pendiente** hasta que un administrador asigne `role` y `jurisdictionIds`.
3. Tras aprobar, el usuario pulsa **Comprobar acceso** o vuelve a iniciar sesión.

El primer administrador no puede autoaprobarse. Desde `functions/`:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="RUTA\al-adminsdk.json"
node scripts/set-user-role.mjs user@domain.com admin jurisdiction-demo
```

Claims:

```json
{
  "role": "evaluator",
  "jurisdictionIds": ["jurisdiction-demo"]
}
```

Roles: `evaluator`, `coordinator`, `admin`. Las reglas de Firestore limitan lecturas/escrituras a las jurisdicciones del token. Una evaluación `submitted` ya no se edita ni borra desde el cliente.

## Despliegue de producción

La guía paso a paso, cada vez que hay un cambio, está en [`DEPLOY.md`](DEPLOY.md).

Resumen: subir versión y changelog → verificar → `git push origin main` (Hosting) → si cambió backend, `firebase deploy --only functions,firestore,storage` → confirmar `vX.Y.Z` en [evalquake.web.app](https://evalquake.web.app).

GitHub Actions publica **solo** Hosting y necesita estos secrets: `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_APP_ID`, `FIREBASE_SERVICE_ACCOUNT_EVALQUAKE`. Si faltan, el sitio queda en modo demostración.

**Móvil:** EAS (`eas.json`). Mismas variables en secretos de EAS. No commitear `.env`, cuentas de servicio ni claves de firma.

## Sincronización offline

En React Native el SDK JS de Firebase no persiste Firestore en disco. Móvil usa SQLite + outbox; web usa persistencia del navegador. Ciclo al arrancar y cada 30 s: guardar en local → encolar → subir fotos → escribir Firestore → quitar de la cola solo si el remoto confirma.

## Reportes

`src/report/renderReportHtml.ts` genera las 17 secciones en el idioma activo.

- Android/iOS: `expo-print` (sin red).
- Web: jsPDF.
- Servidor: `finalizeEvaluation` asigna consecutivo y guarda el PDF canónico en Storage.

El reporte local muestra el UUID y “consecutivo pendiente”.

## Verificación

```bash
npm run typecheck
npm test
npm run lint
npm run export:web
npm --prefix functions run build
```
