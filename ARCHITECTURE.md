# EVALQUAKE — Arquitectura de la aplicación (móvil + web)

**Objetivo del sistema:** digitalizar la evaluación rápida/detallada de habitabilidad post-sismo (basada en el Formulario 2A-AIS + ATC-20/ATC-20-2, adaptada a normativa colombiana — ver `Plantilla_Evaluacion_Rapida_Habitabilidad_PostSismo_2B.docx`), permitir su captura 100% offline en campo, y generar un PDF de reporte por edificación, consolidando todas las evaluaciones de un evento en un panel web para las entidades de gestión del riesgo (CMGRD/CDGRD/UNGRD).

**Supuestos de partida (confirmados con el usuario):**
- Offline-first crítico: el evaluador debe poder diligenciar el formulario completo, tomar fotos y generar el PDF sin ninguna conectividad.
- Alcance: plataforma multi-evaluador con panel de consolidación (no solo captura individual).
- Equipo: un solo desarrollador — la arquitectura debe favorecer servicios administrados y un único lenguaje.
- El PDF debe contener toda la información del formulario, pero el layout no necesita replicar pixel a pixel el Word 2B.

---

## 1. Requisitos

### 1.1 Funcionales
- Un evaluador diligencia en su celular/tablet las 17 secciones del formulario (identificación, tipo de inspección, estructura, daño estructural/no estructural/geotécnico, clasificación de habitabilidad, condiciones preexistentes, recomendaciones, ocupantes, contacto, comentarios, inspectores, croquis, registro fotográfico), incluyendo los checklists ATC-20 ya incorporados en el 2B.
- Captura de fotos, boceto/croquis y firma del evaluador, todo en el dispositivo.
- Geolocalización automática (GPS) de la edificación.
- Generación de un PDF del reporte **inmediatamente**, sin conexión.
- Sincronización en segundo plano cuando el dispositivo recupera señal; sin pérdida de datos ni bloqueo de la app mientras tanto.
- Panel web para coordinadores: lista y mapa de todas las evaluaciones de un evento/jurisdicción, filtrable por clasificación (verde/amarillo/rojo/negro), acceso al PDF y a los datos crudos, exportación masiva.
- Roles: Evaluador (captura), Coordinador/Supervisor (consolidación, reasignación), Administrador (usuarios, jurisdicciones, eventos).
- Numeración consecutiva oficial del informe, asignada sin colisiones aunque varios evaluadores trabajen offline en simultáneo.
- Trazabilidad: una evaluación ya enviada no se sobre-escribe; las correcciones quedan como historial.

### 1.2 No funcionales
- **Offline-first** con sincronización eventual y resolución de conflictos simple (en la práctica, cada edificación la visita un solo equipo, así que el conflicto real es raro — la arquitectura debe explotar esto, no resolver conflictos complejos de escritura concurrente).
- Escala: cientos de evaluadores y algunos miles de evaluaciones por evento — **no** es un sistema de escala masiva; prioriza velocidad de desarrollo sobre sharding/particionamiento sofisticado.
- Mantenible por una sola persona: mínimo código de infraestructura propio, máximo aprovechamiento de servicios administrados.
- Datos críticos de seguridad de vidas: durabilidad y auditoría por encima de la optimización de costos.
- Ancho de banda limitado en la etapa de recuperación (redes saturadas/degradadas) → las fotos deben comprimirse en el dispositivo antes de subir.
- Debe funcionar en Android (mayoría de evaluadores voluntarios/gobierno), iOS y navegador de escritorio (panel de coordinación).

### 1.3 Restricciones
- Un solo desarrollador → un solo lenguaje (TypeScript) de punta a punta si es posible.
- El contenido/estructura de datos ya está definido por el 2B (no hay que diseñarlo desde cero, hay que modelarlo).

---

## 2. Diseño de alto nivel

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│   APP MÓVIL (Android/iOS)    │        │   APP WEB (panel coordinador) │
│   Expo (React Native)        │        │   Mismo monorepo, target web  │
│                               │        │   (React Native Web + Vite)   │
│  ┌─────────────────────────┐ │        │                               │
│  │ Formulario 17 secciones │ │        │  ┌─────────────────────────┐  │
│  │ (mismo esquema TS que   │ │        │  │ Lista + Mapa de         │  │
│  │  usa el 2B)             │ │        │  │ evaluaciones (Firestore │  │
│  └─────────────────────────┘ │        │  │ query en vivo)          │  │
│  ┌─────────────────────────┐ │        │  └─────────────────────────┘  │
│  │ Firestore SDK            │ │        │  ┌─────────────────────────┐  │
│  │ (persistencia offline    │ │        │  │ Exportación masiva /    │  │
│  │  nativa, cola de writes) │ │◄──────►│  │ reasignación / detalle  │  │
│  └─────────────────────────┘ │  sync  │  └─────────────────────────┘  │
│  ┌─────────────────────────┐ │ cuando │                               │
│  │ expo-print (HTML→PDF    │ │  hay   └──────────────┬────────────────┘
│  │  100% en el dispositivo)│ │  señal                │
│  └─────────────────────────┘ │                       │
└──────────────┬────────────────┘                       │
               │ Firestore / Storage SDK (online)        │
               ▼                                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      FIREBASE (backend administrado)                  │
│                                                                        │
│  Firestore            Cloud Storage         Cloud Functions           │
│  (evaluations,        (fotos, croquis,      · asigna consecutivo      │
│   users, events,       firma, PDF            (transacción atómica)    │
│   jurisdictions)        canónico)            · genera PDF canónico    │
│                                               (mismo HTML template,    │
│  Firebase Auth                                Puppeteer)              │
│  (evaluador/coord.,                          · notifica clasificación │
│   custom claims por                           roja/negra              │
│   jurisdicción)                              · exportación masiva     │
│                                                                        │
│  Firebase Hosting → sirve el build web del panel                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Por qué un monorepo con un solo codebase de UI:** Expo (React Native) compila a iOS, Android **y web** desde el mismo código. Para un solo desarrollador, esto significa un único formulario, una única lógica de validación y un único modelo de datos — la vista de coordinador en escritorio reutiliza los mismos componentes de "ver evaluación" y solo agrega pantallas propias (mapa, lista, exportación) optimizadas para pantalla grande.

**Por qué Firebase/Firestore y no un backend propio (Postgres + API REST):** el problema más difícil de este sistema es el offline-first con sincronización confiable, y ahí es donde más tiempo perdería un solo desarrollador construyendo algo desde cero (cola de escritura local, reintentos, resolución de conflictos, invalidación de caché). El SDK de Firestore trae esto ya resuelto para web y móvil: persistencia local automática (SQLite en nativo / IndexedDB en web), escrituras encoladas offline, sincronización automática al reconectar. El costo es menor flexibilidad de consultas (no hay JOINs) y cierto vendor lock-in — aceptable dado el tamaño y la urgencia del proyecto (ver Sección 5, trade-offs).

---

## 3. Modelo de datos (derivado directamente del 2B)

Colecciones de Firestore (documento = JSON; se define también como `type` de TypeScript compartido entre app y Cloud Functions):

```
jurisdictions/{jurisdictionId}
  nombre, departamento, municipio, contactosCMGRD[], logoUrl

events/{eventId}
  nombre ("Sismo 10-ago-2026"), jurisdictionIds[], fechaInicio, activo

evaluations/{evaluationId}          // id = UUID generado en el dispositivo
  eventId, jurisdictionId
  status: "borrador" | "enviada" | "sincronizada"
  consecutivoOficial: number | null  // null hasta que el backend lo asigna
  # Sección 1 — Identificación catastral
  identificacion: { departamento, municipio, comuna, barrio, sector,
                     codigoCatastral, matriculaInmobiliaria, coordenadas }
  # Sección 2 — Tipo de inspección
  inspeccion: { tipo, motivoNoInspeccion, clasificacionPreliminar }
  # Sección 3 — Identificación de la edificación
  edificacion: { direccion, nombre, pisos, usoPredominante, dimensiones,
                 areaHuella, numeroOcupantesEstimado, numeroUnidades }
  # Sección 4 — Estructura
  estructura: { sistemaEstructural, tipoEntrepiso, anioConstruccion }
  # Sección 5 — Estado de daño (checklists ATC-20 incluidos)
  danoEstabilidadGlobal: { condicionesObservadas[], riesgo }
  danoGeotecnico: { morfologia, asentamiento, fallaTalud, origen, riesgo }
  danoEstructural: { elementos[{tipo, ninguno, leve, moderado, fuerte, severo}],
                      pisoMayorDano, riesgo, medidasSugeridas[] }
  danoNoEstructural: { elementos[...], riesgo }
  criteriosCampoNoHabitable: { categoria, item, marcado }[]   // Sección 7.3
  # Sección 6-7 — Daño global y clasificación
  porcentajeDanoGlobal, clasificacionHabitabilidad: "habitable"|"restringido"|"no_habitable"|"colapso"
  # Sección 8-15
  condicionesPreexistentes: {...}
  recomendaciones: { medidasSeguridad[], visitasEspecializadas[], barreras, otras }
  efectoOcupantes: { heridos, fallecidos }
  ocupacion: { habitada, unidadesExistentes, unidadesNoHabitables }
  contacto: { nombre, cedula, telefono, direccion }
  comentarios: string
  inspectores: [{ nombre, profesion, matricula, idInspector, entidad }]
  fechaHoraInspeccion: timestamp
  # Adjuntos (referencias a Storage, no binarios en Firestore)
  fotos: [{ storagePath, seccionRef, caption, lat, lng }]
  croquisStoragePath, firmaStoragePath
  pdfCanonicoStoragePath: string | null
  # Metadatos de sincronización / auditoría
  createdByUserId, deviceId, createdAt, updatedAt, syncedAt
  auditLog subcollection: correcciones posteriores a "enviada"

users/{userId}
  nombre, rol: "evaluador"|"coordinador"|"admin", jurisdictionIds[], matricula
```

**Regla clave de diseño:** una vez `status = "enviada"`, el documento **no se edita** — las correcciones se agregan como entradas en `auditLog` y el PDF se regenera a partir del estado más reciente. Esto evita tener que resolver conflictos de escritura concurrente (que en este dominio son raros pero catastróficos si se pierden) y deja un rastro auditable, apropiado para un documento con valor legal/de seguridad.

**Consecutivo oficial sin colisión offline:** el ID primario (`evaluationId`) es un UUID generado en el dispositivo — funciona sin red. El número consecutivo legible ("N.° del informe") lo asigna una Cloud Function mediante una transacción atómica sobre un contador por jurisdicción, **solo cuando el documento llega al servidor**. El PDF generado offline muestra el UUID con la leyenda "consecutivo pendiente de asignación"; al sincronizar, se regenera el PDF canónico con el número oficial.

---

## 4. Generación de PDF (offline + canónico) — la pieza más particular de este sistema

Se comparte **una sola función** `renderReportHtml(evaluation): string` (TypeScript puro, sin dependencias de plataforma) que convierte el JSON de la evaluación en HTML/CSS con las 17 secciones. Esa función se usa en dos lugares:

1. **En el dispositivo, offline:** `expo-print` toma ese HTML y lo convierte a PDF usando el motor de renderizado nativo (WebView) — funciona sin conexión y sin servidor. El evaluador puede ver/compartir/imprimir el PDF inmediatamente después de terminar la inspección.
2. **En el servidor, al sincronizar:** una Cloud Function toma el mismo HTML (con el consecutivo oficial ya asignado) y lo convierte a PDF con Puppeteer, almacenándolo en Cloud Storage como el PDF canónico que ve el panel de coordinación y que se usa en exportaciones masivas.

Mantener un único generador de HTML (en vez de dos implementaciones de PDF) es lo que hace viable esta dualidad para un solo desarrollador: cualquier cambio de layout se hace en un solo lugar y automáticamente aplica en ambos flujos.

---

## 5. Trade-offs explícitos

| Decisión | Alternativa considerada | Por qué se descarta (por ahora) |
|---|---|---|
| Firestore (NoSQL, offline-first nativo) | Postgres + PowerSync/ElectricSQL | Más flexible para reportes/analítica compleja, pero exige que el desarrollador construya/opere la capa de sincronización — riesgo alto para un solo dev y para el plazo de una emergencia |
| Expo (RN + web) monorepo único | App nativa separada + Next.js separado | Doble código, doble mantenimiento — inviable para un solo desarrollador; se acepta que el panel web se vea "menos custom" al inicio |
| PDF dual (cliente + servidor) desde un HTML compartido | Solo servidor | El requisito de offline-first crítico exige que el PDF exista sin red; se paga con la disciplina de mantener un único template |
| Documento inmutable + historial de auditoría | Edición directa del documento | Un poco más de modelado, pero necesario dado el carácter legal/de seguridad del dictamen |
| Consecutivo asignado por el servidor (async) | Consecutivo generado en el dispositivo | Evita colisiones entre evaluadores offline; el costo es que el PDF offline muestra un número "provisional" hasta sincronizar |

---

## 6. Qué revisar cuando el sistema crezca

- **Si se convierte en plataforma nacional multi-tenant** (muchos municipios/departamentos de forma permanente, no solo una emergencia puntual): migrar el modelo analítico a BigQuery vía la extensión nativa "Firestore → BigQuery" (no reemplazar Firestore, solo espejar para reportes pesados), y formalizar aislamiento multi-tenant con reglas de seguridad más estrictas por `jurisdictionId`.
- **Si el volumen de fotos crece mucho** (miles de edificaciones × varias fotos): agregar la extensión de Firebase "Resize Images" o un pipeline de imágenes dedicado para servir miniaturas al panel web y no descargar el original salvo que se pida.
- **Si se requiere firma digital con validez legal plena** (no solo una imagen de firma capturada en pantalla): integrar un proveedor de firma electrónica certificado en Colombia en vez de la firma-imagen simple del MVP.
- **Si el panel de coordinación necesita analítica pesada** (comparar eventos, series de tiempo, cruces entre jurisdicciones): ese es el punto para introducir un almacén analítico separado (BigQuery) en vez de forzar a Firestore a hacer agregaciones para las que no fue pensado.
- **Si aparece un segundo desarrollador o el proyecto se vuelve producto permanente:** ahí sí vale la pena evaluar separar el panel web de Expo hacia un frontend dedicado (Next.js) para una experiencia de escritorio más nativa, ya que el codebase compartido deja de ser la limitación principal.

---

## 7. Stack resumido

- **Frontend (móvil + web):** Expo (React Native + React Native Web), TypeScript, Expo Router.
- **PDF:** `expo-print` (cliente, offline) + Puppeteer en Cloud Functions (servidor, canónico) sobre un único generador de HTML compartido.
- **Backend:** Firebase — Firestore (datos), Cloud Storage (fotos/PDFs), Firebase Auth (usuarios + custom claims por jurisdicción), Cloud Functions (consecutivo, PDF canónico, notificaciones, exportación masiva), Firebase Hosting (build web).
- **Mapa (panel coordinador):** MapLibre GL JS o Google Maps JS SDK, alimentado directamente por consultas en vivo a Firestore.
- **Monitoreo:** Firebase Crashlytics (móvil) + Cloud Monitoring/Logging (Functions), con alerta específica sobre fallos de generación de PDF canónico.

---

*Basado en: `Plantilla_Evaluacion_Rapida_Habitabilidad_PostSismo_2B.docx` (estructura de datos), ATC-20 / ATC-20-2 (criterios de clasificación), Formulario 2A-AIS, y el contexto del proyecto "EVALUACIONES EDIFICACIONES - TERREMOTO 2026".*
