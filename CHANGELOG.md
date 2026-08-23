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

Cambios posteriores a 0.11.0 se listan aquí hasta el siguiente corte.

## [0.11.0] — 2026-08-22

### Added

- Cada elemento de cantidades tiene ubicación para identificarlo y relacionarlo con el plano de levantamiento de fallas.

## [0.10.0] — 2026-08-22

### Added

- El periodo de construcción se asigna con el año escrito; si el año no se conoce, el periodo se elige a mano.

## [0.9.2] — 2026-08-22

### Fixed

- Las listas de 4 o más opciones (tipo de inspección, riesgo, morfología, cantidades, etc.) usan desplegable para que no se corten.

## [0.9.1] — 2026-08-22

### Fixed

- El sistema estructural predominante se elige en una lista desplegable para que las opciones no se solapen con las ayudas.

## [0.9.0] — 2026-08-22

### Added

- La ficha de la edificación pide largo, ancho y alto en lugar de un solo campo de dimensiones.

## [0.8.1] — 2026-08-22

### Fixed

- La ficha de identificación de la edificación carga la dirección definida en la identificación catastral.

## [0.8.0] — 2026-08-22

### Added

- La ficha catastral captura GPS al inicio, usa Dirección en lugar de Sector y rellena departamento, municipio, comuna, barrio y dirección desde OpenStreetMap.

## [0.7.0] — 2026-08-21

### Added

- La guía de inspección abre con todos los títulos y subtítulos contraídos; se expanden al tocarlos para navegar el documento.

## [0.6.1] — 2026-08-20

### Fixed

- El texto de los botones vuelve a quedar centrado en pantallas estrechas.

## [0.6.0] — 2026-08-20

### Added

- El mapa de coordinación muestra teselas OpenStreetMap o Tracestrack (si hay `EXPO_PUBLIC_TRACESTRACK_KEY`), con cambio a vista satelital y marcadores coloreados por habitabilidad.

## [0.5.2] — 2026-08-20

### Fixed

- El texto de filas, interruptores y badges ya no se superpone en móvil; las opciones se envuelven en escritorio sin colapsar altura.
- El panel de habitabilidad usa fondo claro y texto oscuro para mantener contraste.

## [0.5.1] — 2026-08-20

### Fixed

- Las opciones y campos del formulario ya no se superponen en pantallas estrechas.

## [0.5.0] — 2026-08-20

### Added

- Cuestionario opcional de cantidades de reparación (muros, cubiertas, vigas y columnas), con áreas/volúmenes calculados y exportación CSV de la tabla.

## [0.4.7] — 2026-08-20

### Added

- Los evaluadores pueden eliminar borradores incompletos. Las evaluaciones firmadas o enviadas no se pueden borrar.

## [0.4.6] — 2026-08-20

### Added

- En catastro se pueden escribir latitud y longitud a mano, además de capturarlas con GPS.

## [0.4.5] — 2026-08-19

### Changed

- La sección de amenaza sísmica de la guía muestra solo el mapa y su pie de figura.
- El logotipo de Gtek enlaza a https://gtek.com.co.

## [0.4.4] — 2026-08-19

### Fixed

- Las figuras de la guía y los logotipos de apoyo se empaquetan con el bundle web para que Firebase Hosting los sirva.

## [0.4.3] — 2026-08-19

### Added

- Logotipos de Grupo Terra y Gtek ingeniería, con la leyenda «Con apoyo de», en el pie de todas las pantallas.

## [0.4.2] — 2026-08-19

### Fixed

- El título EVALQUAKE ya no se parte en pantallas estrechas.
- Las figuras de la guía tienen altura explícita para que se vean en la web.

## [0.4.1] — 2026-08-19

### Added

- Figuras de la guía gráfica de inspección, extraídas del DOCX y mostradas en cada sección correspondiente.

## [0.4.0] — 2026-08-18

### Added

- Guía HTML de inspección postsismo, accesible desde el encabezado en todas las pantallas.
- Puntos de inspección según el sistema estructural, irregularidades, servicios cortados, restricciones ATC-20 y acciones posteriores.

### Changed

- El cuestionario incorpora sótanos, aviso a ocupantes y amenaza de caída hacia predios vecinos, según el manual ATC-20-1.

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
