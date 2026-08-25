# Guía de despliegue — EVALQUAKE

Siga estos pasos **cada vez** que un cambio deba llegar a producción (web y/o móvil). El sitio vivo es [https://evalquake.web.app](https://evalquake.web.app). La versión en la cabecera (`vX.Y.Z`) confirma qué build está publicado.

## 1. Clasificar el cambio

| Qué tocó | Hay que publicar |
|---|---|
| UI, i18n, flujo en `app/` o `src/` (salvo Functions) | **Web** (Hosting). Móvil solo si hay APK/IPA en uso. |
| `public/manifest.json`, `app/+html.tsx`, iconos PWA | **Web** (Hosting). `export:web` regenera iconos con `copy-pwa-icons.js`. |
| `functions/` | **Cloud Functions** (p. ej. `finalizeEvaluation`, `moderateDeleteEvaluation`) |
| `firestore.rules`, `firestore.indexes.json` | **Firestore** (reglas y/o índices) |
| `storage.rules` | **Storage** |
| Varios de los anteriores | Backend correspondiente **y** web |

GitHub Actions, al hacer push a `main`, **solo publica Hosting**. Functions, reglas e índices **no** se despliegan solos: hay que hacerlo con Firebase CLI.

## 2. Subir la versión y documentar

1. Decidir el número (Semantic Versioning):
   - **PATCH** (`0.2.1`): corrección.
   - **MINOR** (`0.3.0`): función nueva compatible.
   - **MAJOR** (`1.0.0`): cambio incompatible.
2. Poner el **mismo** número en:
   - `src/version.ts` (`APP_VERSION`)
   - `package.json`
   - `app.json` → `expo.version`
   - `functions/package.json`
3. En `CHANGELOG.md`: pasar lo de **Unreleased** a una sección `## [X.Y.Z] — AAAA-MM-DD` y dejar **Unreleased** vacía.

Sin este paso, producción puede seguir mostrando la versión anterior aunque el código haya cambiado.

## 3. Verificar en local

En la raíz del repo (`E:\dev\EVALQUAKE`):

```powershell
npm run typecheck
npm run test
npm run lint
npm --prefix functions run build
```

Probar el flujo afectado (`npm start` → `w` / `a`). Confirmar que `.env` tiene las claves Firebase y que **no** se usarán emuladores en el build de producción.

## 4. Guardar y subir el código

```powershell
git add -A
git status
git commit -m "Release X.Y.Z: resumen corto del cambio"
git push origin main
```

Eso dispara el workflow **Deploy to Firebase Hosting on merge**. Requisitos:

- Secrets del repo: `EXPO_PUBLIC_FIREBASE_*` y `FIREBASE_SERVICE_ACCOUNT_EVALQUAKE`.
- Opcional: `EXPO_PUBLIC_TRACESTRACK_KEY` para teselas topográficas Tracestrack en el mapa de coordinación (si falta, se usan teselas públicas de OpenStreetMap).
- El job debe usar `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=false` (ya está en el workflow).

Si esos secrets faltan, el sitio vuelve a **modo demostración** y desaparece el registro.

## 5. Publicar backend (cuando aplique)

Hacerlo si cambió Functions, reglas o índices. Desde la raíz, con Firebase CLI autenticado (`firebase use evalquake`):

```powershell
# Solo lo que cambió, o todo el backend:
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage

# Equivalente en un comando:
firebase deploy --only functions,firestore,storage
```

La primera Function nueva puede tardar unos minutos. Si el CLI dice *Skipped (No changes detected)*, ese servicio ya estaba al día.

### 5.1 Notificaciones por email (Fase 1)

Las Cloud Functions encolan mensajes en Firestore `mail/{id}` (idempotencia en `notificationJobs/{dedupeKey}`) para:

1. Solicitud de usuario nuevo → admins  
2. Evaluación enviada → admins + coordinadores de la jurisdicción  
3. Cuenta autorizada → el usuario aprobado  

**Entrega real del correo:** instalar la extensión [Trigger Email from Firestore](https://extensions.dev/extensions/firebase/firestore-send-email) apuntando a la colección `mail`, con SMTP o un proveedor compatible:

```powershell
firebase deploy --only functions,firestore:rules
firebase ext:install firebase/firestore-send-email --project evalquake
```

Parámetro opcional de Functions: `APP_BASE_URL` (por defecto `https://evalquake.web.app`) para los enlaces del cuerpo del correo. Valor local en `functions/.env.evalquake` (ver `.env.evalquake.example`).

**Bandeja in-app (Fase 2):** tras desplegar Functions y reglas, los usuarios autenticados ven la campana en la cabecera. Los documentos viven en `users/{uid}/notifications/{id}`.

**Push móvil (Fase 3):** en iOS/Android (dispositivo físico + build EAS o Expo Go con proyecto EAS), la app pide permiso, guarda el token en `users/{uid}/devices` y Functions envía a la bandeja del sistema con [Expo Push](https://docs.expo.dev/push-notifications/overview/). Tras cambios de código nativo (`expo-notifications`), hace falta un nuevo build EAS.

```powershell
firebase deploy --only functions,firestore:rules
npx eas-cli build --platform android --profile preview
```

**Nota:** en `.firebaserc` no defina un alias con el mismo nombre que el `projectId` (p. ej. `"evalquake": "evalquake"`). Eso hace fallar el deploy con *Can't have both dotenv files with projectId … and projectAlias*.

## 6. Publicar la web (si CI no basta)

Si Actions falló, o quiere publicar **ahora** desde el PC:

```powershell
cd E:\dev\EVALQUAKE
$env:EXPO_PUBLIC_USE_FIREBASE_EMULATORS = "false"
npm run export:web
npx firebase deploy --only hosting
```

`export:web` copia las figuras de la guía a `public/media`, genera iconos PWA en `public/` (`copy-pwa-icons.js`) y luego produce `dist`. **Primero exportar, después desplegar.** Si se despliega un `dist` viejo, la cabecera seguirá en la versión anterior.

`.env` local alimenta el export. **No** deje `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true` en ese build: el sitio intentaría hablar con `127.0.0.1`.

## 7. Comprobar producción

1. Abrir [https://evalquake.web.app](https://evalquake.web.app) con `Ctrl+F5`.
2. La cabecera debe mostrar la versión nueva (`vX.Y.Z`).
3. No debe decir **Modo demostración**.
4. Probar lo cambiado (login, registro, evaluación, fotos, admin, etc.).
5. Si hubo cambios de visibilidad o moderación: evaluador solo ve propias/compartidas; coordinación puede borrar borradores; administración ve el registro en `/(admin)/logs`.
6. Si hubo cambios PWA: comprobar que “Agregar a pantalla de inicio” muestra el ícono de EVALQUAKE.
7. En GitHub → Actions, el workflow de Hosting debe estar en verde.

## 8. Móvil (solo si hay app instalada o tienda)

Las mismas `EXPO_PUBLIC_*` deben existir como secretos de EAS (`eas secret:create`), con emuladores en `false`.

```powershell
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

- `preview`: APK/AAB interno para pruebas.
- `production` + `eas submit`: Play Store / App Store.

iOS requiere cuenta Apple Developer. Tras el build, instalar y confirmar la versión en la cabecera.

El archive que sube EAS respeta [`.easignore`](.easignore) (si existe, **sustituye** `.gitignore`). Ahí se excluyen `DOCS/`, `functions/`, `dist/`, `android`/`ios` locales, skills, etc. Tras cambiar `.easignore`, conviene verificar:

```powershell
npx eas-cli build:inspect --platform android --stage archive --output "$env:TEMP\evalquake-eas-archive" --profile preview
```

El tamaño relevante es el de esa carpeta **sin** `.git` (EAS no sube `.git`). Con el ignore actual suele quedar en el orden de ~6 MB (sobre todo `assets/guide`).

## Lista corta (día a día)

1. Código listo y probado.
2. Subir versión + `CHANGELOG.md`.
3. `git push origin main` → Hosting.
4. Si tocó backend: `firebase deploy --only functions,firestore,storage`.
5. Verificar `vX.Y.Z` en evalquake.web.app.
6. Si hay app nativa: `eas build`.

## Problemas frecuentes

| Síntoma | Qué hacer |
|---|---|
| Sigue **Modo demostración** | El build no trajo `EXPO_PUBLIC_FIREBASE_*`. Revisar secrets de GitHub o exportar en local con `.env` y `USE_FIREBASE_EMULATORS=false`. |
| Página **Firebase Hosting Setup Complete** | No deje `public/index.html` de plantilla Firebase: Expo lo copia a `dist` y tapa la app. Exportar de nuevo (`npm run export:web`) y desplegar Hosting. |
| Cabecera con versión vieja | Hard refresh, o el push/export no se completó. |
| PWA instalada con versión vieja | Hosting debe enviar `no-cache` en `/` (ver `firebase.json`). En el teléfono: borrar datos del sitio o reinstalar el acceso directo tras el deploy. |
| Evaluador ve fichas ajenas en web | Cerrar sesión y volver a entrar; el almacén local ahora es por usuario. Borrar datos del sitio solo si persiste en el mismo navegador. |
| Icono genérico al instalar PWA | Volver a exportar (`npm run export:web`) y desplegar Hosting; el manifest y los PNG deben estar en `dist/`. |
| Cuenta nueva no puede evaluar | El admin debe aprobar rol y jurisdicción; el usuario pulsa **Comprobar acceso**. |
| Functions no aplica el cambio | No basta el push: `firebase deploy --only functions`. |
| `set-user-role.mjs` no encontrado | Ejecutar desde `functions\`: `node scripts/set-user-role.mjs ...` |
| Fotos antiguas muy pesadas en Storage / PDF | Desde `functions\`, con cuenta de servicio: `node scripts/optimize-storage-photos.mjs` (dry-run) y luego `--apply`. Opcional `--sketches`. |
| No llegan correos de solicitud/evaluación/aprobación | Falta la extensión **Trigger Email** (o un worker que lea `mail/`). Ver sección 5.1. Comprobar documentos en Firestore `mail` y jobs en `notificationJobs`. |
| No llega push al móvil | Hace falta build nativo (EAS), permiso concedido y token en `users/{uid}/devices`. Web no recibe push. Verificar logs de Functions y tickets Expo. |

```
$env:GOOGLE_APPLICATION_CREDENTIALS="E:\secrets\evalquake-adminsdk.json"
cd E:\dev\EVALQUAKE\functions
node scripts/optimize-storage-photos.mjs
node scripts/optimize-storage-photos.mjs --apply
```

Nunca suba `.env`, JSON de cuenta de servicio ni claves de firma a GitHub.
