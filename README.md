# EVALQUAKE

**Versión actual: [0.16.0](CHANGELOG.md)**

EVALQUAKE es una aplicación para evaluar daños y habitabilidad de edificaciones después de un sismo. Está pensada para equipos de inspección en campo y para quienes coordinan o administran la respuesta desde un municipio, un departamento o el nivel nacional.

Funciona en celular, tableta y computador (navegador). Está disponible en español e inglés. Se puede usar sin conexión a internet: la inspección se guarda en el dispositivo y se envía cuando vuelve la señal.

- Sitio en producción: [https://evalquake.web.app](https://evalquake.web.app)
- Código del proyecto: [https://github.com/Kmauqs/EVALQUAKE](https://github.com/Kmauqs/EVALQUAKE)

El contenido del formulario se apoya en el Formulario Regional Homogenizado 2A (AIS), el Manual de Campo y las listas ATC-20 / ATC-20-2, en línea con la normativa colombiana NSR-10.

---

## Para qué sirve

Después de un terremoto, los evaluadores visitan viviendas y edificios, registran lo que observan y emiten un dictamen de habitabilidad (si se puede ocupar, con restricciones o si no es seguro). EVALQUAKE digitaliza ese proceso: captura en campo, informe imprimible, pancarta de ocupación y consolidación en un panel para la coordinación.

---

## Qué puede hacer cada persona

### Evaluador (inspección en campo)

- Crear y completar una evaluación en 17 secciones: ubicación y catastro, tipo de inspección, datos de la edificación, sistema estructural, daños, habitabilidad, recomendaciones, ocupantes, inspectores, croquis y fotos, entre otras.
- Usar GPS para ubicar la edificación y, cuando hay red, completar dirección y datos de ubicación a partir del mapa.
- Tomar o adjuntar varias fotos, dibujar o subir un croquis y firmar la inspección.
- Guardar borradores aunque no haya internet; al recuperar la señal, la app intenta subirlos.
- Generar el informe y la pancarta ATC-20 (inspeccionado, uso restringido o inseguro) e imprimirlos o guardarlos como PDF.
- Ver solo sus propias inspecciones y las que otro evaluador le compartió como inspector de apoyo.
- Compartir un borrador con un compañero para que colabore en la misma ficha.
- Eliminar solo sus borradores incompletos. Una inspección ya enviada no se puede modificar ni borrar desde su cuenta.
- Entrar a un **panel de consulta** de solo lectura con el mapa y el listado de las inspecciones de los grupos de trabajo a los que un coordinador lo haya asignado.

### Coordinación

- Puede usar también el flujo de **Evaluador**: crear y completar inspecciones propias en campo, con la misma experiencia offline, fotos, informe y pancarta.
- Crear y administrar varios **grupos de trabajo**: darles un nombre (que no se puede repetir con los ya existentes) y agregar integrantes de entre las cuentas ya autorizadas por administración.
- Ver las inspecciones de los integrantes de sus grupos de trabajo, más las propias, con el nombre o correo de quien las diligenció.
- Filtrar por nivel de daño, por evaluador y por grupo de trabajo.
- Consultar el mapa con marcadores según habitabilidad (vista de calle o satélite).
- Abrir el detalle de cada ficha, el informe y las exportaciones (tablas y un resumen de lo filtrado).
- Eliminar borradores de los integrantes de sus grupos cuando hace falta depurar (siempre con confirmación). No elimina fichas ya enviadas ni de cuentas ajenas a sus grupos.

### Administración

- Aprobar cuentas nuevas, asignar el rol (evaluador, coordinación o administración) y la jurisdicción de trabajo.
- Ver todas las inspecciones sin restricción de grupo de trabajo, más un registro de acciones sensibles (por ejemplo, borrados moderados).
- Eliminar cualquier ficha, incluso las ya enviadas, cuando la política institucional lo permita. Cada borrado queda documentado en ese registro.

---

## Cómo entra un usuario nuevo

1. La persona crea su cuenta con correo y contraseña en la pantalla de inicio.
2. Queda pendiente hasta que un administrador la apruebe y le asigne rol y jurisdicción.
3. Cuando ya está aprobada, inicia sesión (o pulsa “Comprobar acceso”) y puede trabajar según su rol.

Sin esa aprobación no puede evaluar ni ver el panel de coordinación. El primer administrador del sistema se configura por fuera de la pantalla de registro, con un procedimiento técnico documentado para el equipo de soporte.

---

## Seguridad y control de acceso

EVALQUAKE trata las inspecciones como información sensible: afectan decisiones sobre ocupación de viviendas y pueden tener valor de auditoría.

**Quién ve qué.** Cada evaluador ve lo suyo, lo que le compartieron y lo de los grupos de trabajo a los que fue asignado. Quien tiene rol de coordinación puede evaluar en campo (y entonces ve sus fichas propias como evaluador) y, en el panel de coordinación, ve las inspecciones de los integrantes de sus grupos de trabajo. Administración ve el conjunto. En un mismo computador o navegador, si varias personas inician sesión, cada una ve solo sus datos: no se mezclan las fichas locales de una cuenta con las de otra.

**Quién puede borrar.** Los evaluadores solo borran sus borradores. Coordinación puede limpiar borradores de los integrantes de sus grupos de trabajo (por ejemplo, pruebas o duplicados), no de cuentas ajenas. Administración puede borrar cualquier ficha, pero con aviso y dejando constancia en un registro que solo ella consulta.

**Qué no se puede cambiar después del envío.** Una vez la inspección se envía, el contenido queda fijo para el evaluador. El servidor asigna un número consecutivo oficial y guarda una copia canónica del informe. Así se reduce el riesgo de alterar un dictamen ya formalizado.

**Cuentas y jurisdicciones.** Nadie opera “libre” tras registrarse: un administrador debe activar la cuenta y delimitar dónde puede trabajar (municipio, departamento o alcance nacional). Las reglas del servidor refuerzan esos límites: no basta con lo que muestra la pantalla.

**Sesión en el dispositivo.** La sesión puede permanecer abierta en el equipo (hasta unos 30 días) para no pedir contraseña en cada visita a campo; el cierre o el cambio de usuario aíslan de nuevo los datos locales.

**Credenciales.** Las claves y secretos del sistema no van en el código público. El sitio de producción solo funciona en modo real cuando está correctamente configurado; si faltan esas configuraciones, la app puede abrirse en modo demostración (datos de prueba, solo en el dispositivo).

---

## Aspectos técnicos (en lenguaje sencillo)

**Una sola aplicación, varios dispositivos.** El mismo sistema sirve para Android, iOS y web. En el navegador se puede instalar como acceso directo (con el ícono de EVALQUAKE) para usarla casi como una app.

**Trabajo sin red.** En el celular o tableta la información se guarda de forma local; en el navegador también, separada por usuario. Cuando hay conexión, la app sube fotos e inspecciones y confirma que el servidor las recibió antes de darlas por sincronizadas. Si algo falla, se puede reintentar y se muestra el mensaje de error.

**Informes.** El informe incluye leyenda legal, las secciones de la inspección, croquis, fotos y un anexo normativo. Al imprimir, el encabezado (marca, título, consecutivo, fecha e identificador) se repite en cada página. La pancarta sigue el criterio ATC-20 de ocupación. Mientras la ficha no esté enviada, el informe local muestra un identificador provisional y “consecutivo pendiente”.

**Guía en la app.** Desde el encabezado se abre una guía gráfica de inspección (secciones plegables y figuras de apoyo) para orientar al evaluador en campo.

**Mapa y exportaciones.** Coordinación ubica en mapa las inspecciones de sus grupos de trabajo y puede exportar listados o un resumen de lo que tiene filtrado en pantalla.

**Avisos.** Administración recibe correo, aviso en la app y notificación al móvil cuando llega una solicitud de cuenta nueva o una inspección enviada; el usuario recibe el aviso cuando su cuenta queda autorizada.

**Infraestructura.** Los datos viven en un servicio en la nube (Firebase): autenticación, base de datos, archivos (fotos y PDF) y lógica de servidor (número consecutivo, PDF oficial, borrados moderados). El sitio público se publica en [evalquake.web.app](https://evalquake.web.app). El número de versión aparece en la cabecera de la app (`v0.16.0` y siguientes) para saber qué versión está en uso.

**Idioma.** El selector EN / ES del encabezado cambia el idioma de la interfaz y se recuerda en el dispositivo.

**Apoyo institucional.** En el pie de las pantallas aparecen los logotipos de apoyo de Grupo Terra y Gtek.

---

## Documentación relacionada

| Documento | Para quién |
|---|---|
| [CHANGELOG.md](CHANGELOG.md) | Historial de versiones y cambios publicados |
| [DEPLOY.md](DEPLOY.md) | Equipo técnico: cómo publicar una versión nueva |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Equipo técnico: diseño del sistema, datos y decisiones |

La bitácora de versiones usa numeración mayor.menor.parche. Cada entrega actualiza la versión visible en la app y deja constancia en el changelog. El procedimiento detallado de publicación está en la guía de despliegue.
