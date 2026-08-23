# EVALQUAKE

**Versión actual: [0.12.1](CHANGELOG.md)**

Evaluación rápida de daños y habitabilidad postsismo, bilingüe (español/inglés) y offline-first para Android, iOS y web. El formulario unifica el Formulario Regional Homogenizado 2A (AIS) con el Manual de Campo y listas ATC-20 / ATC-20-2, en cumplimiento de la NSR-10. Sigue [`ARCHITECTURE.md`](ARCHITECTURE.md) y usa `icon_960.png` como icono, favicon, splash y base visual.

- Sitio de producción: [https://evalquake.web.app](https://evalquake.web.app)
- Código: [https://github.com/Kmauqs/EVALQUAKE](https://github.com/Kmauqs/EVALQUAKE)

## Versionado

Cada entrega se registra en [`CHANGELOG.md`](CHANGELOG.md) con Semantic Versioning (`MAJOR.MINOR.PATCH`).

La misma versión debe coincidir en:

| Archivo | Campo |
|---|---|
| `src/version.ts` | `APP_VERSION` (se muestra en la cabecera de la app) |
| `package.json` | `version` |
| `app.json` | `expo.version` |
| `functions/package.json` | `version` |

Al cerrar un conjunto de cambios: subir el número, anotar la bitácora y seguir [`DEPLOY.md`](DEPLOY.md).

## Qué incluye

- App Expo Router + TypeScript para Android, iOS y web responsive.
- Flujo resumible de 17 secciones (2A-AIS / 2B / ATC-20): catastro con GPS y geocodificación, NSR-10, sistema estructural, daños, habitabilidad, cantidades de reparación, inspectores, croquis y fotos.
- Guía gráfica de inspección desde el encabezado (secciones contraídas, figuras empaquetadas en el bundle web).
- Borradores locales y cola de salida: SQLite en móvil, persistencia del navegador en web. Sesión persistente en el dispositivo (hasta 30 días).
- GPS, cámara/galería (varias fotos, persistentes), croquis por imagen y firma en modal fijo.
- Informe HTML bilingüe con leyenda legal, anexo normativo, croquis en página propia y encabezado en cada página del PDF impreso. Pancarta ATC-20 de ocupación.
- Envío inmutable: una evaluación enviada no se sobrescribe. El servidor asigna consecutivo oficial y guarda el PDF canónico.
- Panel de coordinación: filtros, mapa OSM (u opcionalmente Tracestrack) con vista satelital y marcadores por habitabilidad, detalle y exportaciones CSV/JSON.
- Autenticación por correo: el usuario crea su cuenta y un **admin** la aprueba, asigna rol y jurisdicción. Roles `evaluator`, `coordinator` y `admin`.
- Logotipos de apoyo (Grupo Terra y Gtek) en el pie de las pantallas.

Sin variables Firebase el cliente arranca en **modo demostración** (datos ficticios, solo en el dispositivo).

## Ejecutar en local

Requisitos: Node.js 22+, npm, y Expo Go o un simulador Android/iOS.

```bash
npm install
npm start
```

Luego `a` (Android), `i` (iOS, macOS/Xcode) o `w` (web). En web, `npm start` no copia las figuras de la guía; use `npm run web` o `npm run export:web`. El control `EN` / `ES` del encabezado cambia el idioma y se guarda en el dispositivo.

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
node scripts/set-user-role.mjs user@domain.com admin Nacional
```

Claims:

```json
{
  "role": "evaluator",
  "jurisdictionIds": ["Nacional", "Cali", "Armenia"]
}
```

Roles: `evaluator`, `coordinator`, `admin`. Las reglas de Firestore limitan lecturas/escrituras a las jurisdicciones del token. La etiqueta `Nacional` da visibilidad de todas las inspecciones del evento en el panel de coordinación. Una evaluación `submitted` ya no se edita ni borra desde el cliente. Los evaluadores sí pueden eliminar borradores incompletos.

## Despliegue de producción

La guía paso a paso, cada vez que hay un cambio, está en [`DEPLOY.md`](DEPLOY.md).

Resumen: subir versión y changelog → verificar → `git push origin main` (Hosting) → si cambió backend, `firebase deploy --only functions,firestore,storage` → confirmar `vX.Y.Z` en [evalquake.web.app](https://evalquake.web.app).

GitHub Actions publica **solo** Hosting y necesita estos secrets: `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_APP_ID`, `FIREBASE_SERVICE_ACCOUNT_EVALQUAKE`. Si faltan, el sitio queda en modo demostración.

**Móvil:** EAS (`eas.json`). Mismas variables en secretos de EAS. No commitear `.env`, cuentas de servicio ni claves de firma.

## Sincronización offline

En React Native el SDK JS de Firebase no persiste Firestore en disco. Móvil usa SQLite + outbox; web usa persistencia del navegador. Ciclo al arrancar y cada 30 s: guardar en local → encolar → subir fotos → escribir Firestore → quitar de la cola solo si el remoto confirma.

## Informes y pancartas

`src/report/renderReportHtml.ts` genera el informe en el idioma activo: preámbulo legal, 17 secciones, croquis a página completa, registro fotográfico y anexo normativo. El encabezado (marca, título, consecutivo, fecha e id) se repite en cada página al imprimir.

`src/report/renderPlacardHtml.ts` genera la pancarta ATC-20 (inspeccionado / uso restringido / inseguro).

- Cliente (web y nativo): se abre el HTML y **Imprimir en PDF** (`window.print` / diálogo del sistema).
- Servidor: `finalizeEvaluation` asigna consecutivo y guarda el PDF canónico en Storage (Puppeteer sobre el mismo HTML).

El informe local muestra el UUID y “consecutivo pendiente” hasta el envío.

## Verificación

```bash
npm run typecheck
npm test
npm run lint
npm run export:web
npm --prefix functions run build
```
