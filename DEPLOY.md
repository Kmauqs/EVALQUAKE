# Guía de despliegue — EVALQUAKE

Siga estos pasos **cada vez** que un cambio deba llegar a producción (web y/o móvil). El sitio vivo es [https://evalquake.web.app](https://evalquake.web.app). La versión en la cabecera (`vX.Y.Z`) confirma qué build está publicado.

## 1. Clasificar el cambio

| Qué tocó | Hay que publicar |
|---|---|
| UI, i18n, flujo en `app/` o `src/` (salvo Functions) | **Web** (Hosting). Móvil solo si hay APK/IPA en uso. |
| `functions/` | **Cloud Functions** |
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

## 6. Publicar la web (si CI no basta)

Si Actions falló, o quiere publicar **ahora** desde el PC:

```powershell
cd E:\dev\EVALQUAKE
$env:EXPO_PUBLIC_USE_FIREBASE_EMULATORS = "false"
npm run export:web
npx firebase deploy --only hosting
```

`export:web` copia las figuras de la guía a `public/media` y luego genera `dist`. **Primero exportar, después desplegar.** Si se despliega un `dist` viejo, la cabecera seguirá en la versión anterior.

`.env` local alimenta el export. **No** deje `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true` en ese build: el sitio intentaría hablar con `127.0.0.1`.

## 7. Comprobar producción

1. Abrir [https://evalquake.web.app](https://evalquake.web.app) con `Ctrl+F5`.
2. La cabecera debe mostrar la versión nueva (`vX.Y.Z`).
3. No debe decir **Modo demostración**.
4. Probar lo cambiado (login, registro, evaluación, fotos, admin, etc.).
5. En GitHub → Actions, el workflow de Hosting debe estar en verde.

## 8. Móvil (solo si hay app instalada o tienda)

Las mismas `EXPO_PUBLIC_*` deben existir como secretos de EAS (`eas secret:create`), con emuladores en `false`.

```powershell
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

- `preview`: APK/AAB interno para pruebas.
- `production` + `eas submit`: Play Store / App Store.

iOS requiere cuenta Apple Developer. Tras el build, instalar y confirmar la versión en la cabecera.

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
| Cabecera con versión vieja | Hard refresh, o el push/export no se completó. |
| Cuenta nueva no puede evaluar | El admin debe aprobar rol y jurisdicción; el usuario pulsa **Comprobar acceso**. |
| Functions no aplica el cambio | No basta el push: `firebase deploy --only functions`. |
| `set-user-role.mjs` no encontrado | Ejecutar desde `functions\`: `node scripts/set-user-role.mjs ...` |

Nunca suba `.env`, JSON de cuenta de servicio ni claves de firma a GitHub.
