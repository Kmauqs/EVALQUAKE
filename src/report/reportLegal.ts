import type { Language } from '../domain/evaluation';
import { escapeHtml } from './htmlChrome';

const escape = escapeHtml;

export const REPORT_BASIS_ES =
  'Basado en el Formulario Regional Homogenizado 2A (AIS) y el Manual de Campo para Inspección de Edificaciones Después de un Sismo, con listas de verificación armonizadas con el ATC-20 / ATC-20-2 (Applied Technology Council) — En cumplimiento de la NSR-10 y la reglamentación colombiana de gestión del riesgo';

export const REPORT_BASIS_EN =
  'Based on the Homogenized Regional Form 2A (AIS) and the Field Manual for Inspection of Buildings After an Earthquake, with checklists harmonized with ATC-20 / ATC-20-2 (Applied Technology Council) — In compliance with NSR-10 and Colombian disaster-risk regulations';

export const REPORT_WARNING_LABEL_ES = 'ADVERTENCIA IMPORTANTE.';
export const REPORT_WARNING_LABEL_EN = 'IMPORTANT WARNING.';

export const REPORT_WARNING_ES =
  'Esta evaluación es una inspección visual RÁPIDA y PRELIMINAR, de carácter no destructivo, realizada para dictaminar de forma inmediata la habitabilidad de la edificación y proteger la vida de sus ocupantes y de terceros. NO constituye un estudio de vulnerabilidad sísmica, una evaluación estructural detallada ni un diseño de reforzamiento. La clasificación asignada puede cambiar si se detectan nuevos daños, si ocurren réplicas, o al realizarse una evaluación detallada por un ingeniero civil con matrícula profesional vigente, de conformidad con el Título A de la NSR-10 y la Ley 400 de 1997.';

export const REPORT_WARNING_EN =
  'This evaluation is a RAPID and PRELIMINARY visual inspection, non-destructive, performed to immediately determine the occupancy of the building and protect the lives of occupants and third parties. It does NOT constitute a seismic vulnerability study, a detailed structural evaluation, or a strengthening design. The assigned classification may change if new damage is found, if aftershocks occur, or when a detailed evaluation is performed by a licensed civil engineer, in accordance with Title A of NSR-10 and Law 400 of 1997.';

/** Source: DOCS/INFORME_anexo_final.md */
export const REPORT_ANNEX_TITLE =
  'ANEXO. MARCO NORMATIVO Y REFERENCIAS TÉCNICAS APLICABLES';

const COLOMBIAN_LAW = [
  'Ley 400 de 1997 — Por la cual se adoptan normas sobre construcciones sismo resistentes.',
  'Decreto 926 de 2010 y modificatorios (Decreto 2525 de 2010, Decreto 340 de 2012, Decreto 470 de 2015, Decreto 945 de 2017, Decreto 1783 de 2021) — Reglamento Colombiano de Construcción Sismo Resistente NSR-10, en particular el Título A (Requisitos generales de diseño y construcción sismo resistente).',
  'Decreto 1077 de 2015 — Decreto Único Reglamentario del Sector Vivienda, Ciudad y Territorio (incorpora y actualiza la NSR-10).',
  'Ley 1523 de 2012 — Por la cual se adopta la Política Nacional de Gestión del Riesgo de Desastres y se establece el Sistema Nacional de Gestión del Riesgo de Desastres (SNGRD); define competencias de alcaldías, CMGRD/CDGRD y UNGRD en la respuesta a emergencias.',
  'Ley 9 de 1989 y Ley 388 de 1997 — Régimen de reforma urbana y ordenamiento territorial (facultades de las autoridades municipales para ordenar desalojos, demoliciones y cerramientos preventivos por riesgo).',
  'Decreto 2157 de 2017 — Por medio del cual se adoptan directrices generales para la elaboración del plan de gestión del riesgo de desastres de las entidades públicas y privadas.',
  'Ley 400 de 1997, art. 47 y ss., y NSR-10 Título A.10 — Evaluación e intervención de edificaciones construidas antes de la vigencia de la norma y edificaciones indispensables.',
  'Reglamentación municipal / distrital de curadurías urbanas y Oficinas de Gestión del Riesgo (OMPAD/OMGRD) que active el respectivo Plan de Emergencia y protocolos EDAN (Evaluación de Daños y Análisis de Necesidades).',
  'Código Civil y régimen de propiedad horizontal (Ley 675 de 2001) — en lo relativo a restricciones de uso y obligaciones del propietario/administrador tras el dictamen de habitabilidad.',
];

const TECHNICAL_GUIDES = [
  'Asociación Colombiana de Ingeniería Sísmica (AIS) — Formulario Regional Homogenizado 2A para Evaluación Rápida de Daños en Edificaciones, V.1.0 (03-2023).',
  'Alcaldía de Manizales / AIS — Manual de Campo para la Inspección de Edificaciones Después de un Sismo, Versión 1.0, junio de 2003.',
  'FHECOR Ingenieros Consultores — Guía de Inspección y Evaluación en Situación de Emergencia de Daños Debidos al Sismo en Edificios.',
  'Academia Nacional de la Ingeniería y el Hábitat (ANIH), Boletín N.° 61, 2023 — Evaluación Rápida de Daños en Edificaciones (metodología de semáforo A/B/C — bajo/medio/alto).',
  'Applied Technology Council — ATC-20, Procedures for Postearthquake Safety Evaluation of Buildings, 2.ª edición (Redwood City, CA).',
  'Applied Technology Council — ATC-20-2, Addendum to the ATC-20 Postearthquake Building Safety Evaluation Procedures (1995) — checklists de riesgos estructurales, no estructurales y geotécnicos, y criterios de colocación de avisos (INSPECTED/RESTRICTED USE/UNSAFE) incorporados en las Secciones 5.1, 5.3, 5.4 y 7 de este formato.',
  'Applied Technology Council — ATC-20 Rapid and Detailed Evaluation Safety Assessment Forms, © 1995-07 (formularios oficiales verbatim, incluido el Apéndice A "Guidance for Owners and Occupants of Damaged Buildings" del ATC-20-2), consultados directamente para esta versión del formato.',
  "California Governor's Office of Emergency Services (Cal OES) — Safety Assessment Program (SAP), Evaluator Student Manual, 2022 v.17 — fuente de los criterios detallados de clasificación NO HABITABLE/UNSAFE (Sección 7.3), del checklist de seguridad del equipo evaluador (portada) y de los tiempos de referencia por nivel de evaluación (Rápida/Detallada/Ingeniería).",
  'New Zealand Society for Earthquake Engineering (NZSEE) — Post-Earthquake Building Safety Evaluation Procedures, Preparedness Checklist and Response Plan for Territorial Authorities — referencia comparada adicional sobre niveles de evaluación.',
  'Fédération Internationale / EMS-98 — Escala Macrosísmica Europea, como referencia complementaria para tipificación de daños.',
];

const USAGE_NOTES = [
  'Este formato unifica los campos del Formulario Regional Homogenizado 2A (AIS) con la estructura de 17 secciones descrita en el Manual de Campo para la Inspección de Edificaciones Después de un Sismo, de manera que pueda emplearse de forma indistinta por comisiones de evaluación en cualquier municipio colombiano, conservando la trazabilidad frente al formato nacional homogenizado y facilitando la consolidación posterior de la información en las bases de datos de la UNGRD/CMGRD/CDGRD.',
  'Adicionalmente, se incorporaron checklists y criterios del ATC-20-2 (Addendum to the ATC-20 Postearthquake Building Safety Evaluation Procedures) como capa de verificación complementaria: (i) el listado de condiciones observables de estabilidad global (Sección 5.1); (ii) los elementos de fundaciones, diafragmas/arriostramiento horizontal y conexiones prefabricadas en daños estructurales (Sección 5.3); (iii) los elementos de revestimientos/vidrios, escaleras/salidas de emergencia y ascensores en daños no estructurales (Sección 5.4); y (iv) el criterio de severidad global vs. localizada y las instrucciones de colocación de avisos en todos los accesos para las clasificaciones amarilla y roja (Sección 7). El contenido del ATC-20-2 referenciado proviene de los formularios oficiales Rapid Evaluation Safety Assessment Form y Detailed Evaluation Safety Assessment Form publicados por el Applied Technology Council (atcouncil.org); se recomienda a la comisión de evaluación consultar el documento completo del ATC-20-2 cuando esté disponible para verificar cualquier detalle adicional.',
];

function list(items: string[]) {
  return `<ul>${items.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>`;
}

export function renderReportPreambleHtml(language: Language) {
  const basis = language === 'en' ? REPORT_BASIS_EN : REPORT_BASIS_ES;
  const warningLabel = language === 'en' ? REPORT_WARNING_LABEL_EN : REPORT_WARNING_LABEL_ES;
  const warning = language === 'en' ? REPORT_WARNING_EN : REPORT_WARNING_ES;
  return `<aside class="preamble"><p class="basis">${escape(basis)}</p><p class="warning"><strong>${escape(
    warningLabel,
  )}</strong> ${escape(warning)}</p></aside>`;
}

export function renderReportAnnexHtml() {
  return `<section class="annex"><h2>${escape(REPORT_ANNEX_TITLE)}</h2>
<h3>Normatividad colombiana</h3>
${list(COLOMBIAN_LAW)}
<h3>Guías técnicas y metodológicas de referencia (base metodológica de este formato)</h3>
${list(TECHNICAL_GUIDES)}
<h3>Nota sobre el uso de este formato</h3>
${USAGE_NOTES.map((paragraph) => `<p>${escape(paragraph)}</p>`).join('')}</section>`;
}
