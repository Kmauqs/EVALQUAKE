# Changelog

Todas las versiones relevantes de EVALQUAKE se documentan aquí.

El proyecto usa [Semantic Versioning](https://semver.org/lang/es/): **MAJOR.MINOR.PATCH**.

- **MAJOR**: cambios incompatibles (flujo, datos o API).
- **MINOR**: funciones nuevas compatibles.
- **PATCH**: correcciones y ajustes menores.

Al publicar un cambio, actualizar juntos:

1. `src/version.ts`
2. `package.json`
3. `app.json` (`expo.version`)
4. `functions/package.json`
5. esta bitácora

Luego seguir [`DEPLOY.md`](DEPLOY.md).

La versión visible en la cabecera de la app sale de `src/version.ts`.

## [Unreleased]

Cambios posteriores a 0.3.0 se listan aquí hasta el siguiente corte.

## [0.3.0] — 2026-08-18

### Added

- Sesión persistente en el dispositivo, con cierre automático a los 30 días.
- Categoría NSR-10, sistema estructural, entrepiso, cubierta y periodo de construcción.
- Listas ATC-20 de estabilidad global, daño estructural/no estructural y revisión de equipos.
- Pancarta HTML ATC-20 (inspeccionado, uso restringido, inseguro / peligro de colapso).
- Informe HTML completo con botón **Imprimir en PDF**.

### Changed

- El flujo final abre el informe HTML en lugar de generar un PDF automáticamente.
- «Área de huella» pasa a «Área en planta».
- La clasificación de habitabilidad se deriva de los cuatro niveles de riesgo y colorea el recuadro.
- Los criterios ATC-20 de campo se integran en Estabilidad global.

### Removed

- La sección independiente «Criterios ATC-20 en campo».

## [0.2.1] — 2026-08-17

### Added

- Pastilla de versión `vX.Y.Z` en la cabecera, junto al selector de idioma.
- El logo y el nombre EVALQUAKE llevan al menú de inicio.
- Guía de despliegue en `DEPLOY.md`.

### Changed

- La cabecera de versión es visible en web y móvil para confirmar el build publicado.

## [0.2.0] — 2026-08-17

Primera versión con seguimiento formal. Consolida el MVP desplegado en web y Firebase.

### Added

- Registro de evaluadores desde la pantalla de inicio, con aprobación por un administrador.
- Módulo de administración: listar, aprobar, asignar rol/jurisdicción y desactivar cuentas.
- Registro fotográfico con vistas previas, descripción por foto y selección múltiple desde la galería.
- Croquis por foto o imagen, con vista previa en el recuadro.
- Firma en cuadro emergente fijo.
- Mapa de coordinación con gestos, zoom y ubicación actual.
- Autenticación Firebase (correo/contraseña) y roles `evaluator`, `coordinator`, `admin`.
- PDF local (web y nativo) y PDF canónico en Cloud Functions.

### Changed

- La web de producción deja el modo demostración cuando el build incluye `EXPO_PUBLIC_FIREBASE_*`.
- GitHub Actions inyecta esa configuración desde secrets del repositorio.
- Navegación atrás con destino de respaldo si no hay historial.
- Ajustes de diseño en móviles (inicio, evaluador, coordinación).

### Fixed

- Coordenadas del trazo de firma alineadas con el toque.
- Títulos y botones comprimidos en pantallas estrechas.

## [0.1.0] — 2026-08-17

MVP inicial: 17 secciones, borradores sin conexión, panel de coordinación, i18n ES/EN y adaptadores Firebase.
