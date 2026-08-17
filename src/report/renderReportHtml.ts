import type { Evaluation, Language } from '../domain/evaluation';
import { en, es } from '../i18n/translations';

const escape = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export function renderReportHtml(evaluation: Evaluation, language: Language) {
  const t = language === 'es' ? es : en;
  const row = (label: string, value: unknown) =>
    `<div class="row"><span>${escape(label)}</span><strong>${escape(value || '—')}</strong></div>`;
  const section = (index: number, content: string) =>
    `<section><h2>${index + 1}. ${escape(t.sections[index])}</h2>${content}</section>`;
  const risk = (value: string) => escape((t as Record<string, unknown>)[value] ?? value);

  const content = [
    section(
      0,
      row(t.fields.department, evaluation.identification.department) +
        row(t.fields.municipality, evaluation.identification.municipality) +
        row(t.fields.commune, evaluation.identification.commune) +
        row(t.fields.neighborhood, evaluation.identification.neighborhood) +
        row(t.fields.sector, evaluation.identification.sector) +
        row(t.fields.cadastralCode, evaluation.identification.cadastralCode) +
        row(t.fields.propertyRegistration, evaluation.identification.propertyRegistration) +
        row(
          'GPS',
          evaluation.identification.coordinates
            ? `${evaluation.identification.coordinates.latitude.toFixed(6)}, ${evaluation.identification.coordinates.longitude.toFixed(6)}`
            : '',
        ),
    ),
    section(
      1,
      row(t.fields.inspectionType, t[evaluation.inspection.type]) +
        row(t.fields.notInspectedReason, evaluation.inspection.notInspectedReason) +
        row(
          t.fields.preliminaryClassification,
          evaluation.inspection.preliminaryClassification
            ? t[evaluation.inspection.preliminaryClassification]
            : '',
        ),
    ),
    section(
      2,
      row(t.address, evaluation.building.address) +
        row(t.fields.buildingName, evaluation.building.name) +
        row(t.fields.floors, evaluation.building.floors) +
        row(t.fields.predominantUse, evaluation.building.predominantUse) +
        row(t.fields.dimensions, evaluation.building.dimensions) +
        row(t.fields.footprintArea, evaluation.building.footprintArea) +
        row(t.fields.estimatedOccupants, evaluation.building.estimatedOccupants) +
        row(t.fields.units, evaluation.building.units),
    ),
    section(
      3,
      row(t.fields.structuralSystem, evaluation.structure.structuralSystem) +
        row(t.fields.floorSystem, evaluation.structure.floorSystem) +
        row(t.fields.constructionYear, evaluation.structure.constructionYear),
    ),
    section(
      4,
      row(t.fields.risk, risk(evaluation.globalStability.risk)) +
        row(t.fields.observedConditions, evaluation.globalStability.observedConditions.join(', ')) +
        row(t.fields.notes, evaluation.globalStability.notes),
    ),
    section(
      5,
      row(t.fields.morphology, evaluation.geotechnicalDamage.morphology) +
        row(t.fields.settlement, evaluation.geotechnicalDamage.settlement ? t.yes : t.no) +
        row(t.fields.slopeFailure, evaluation.geotechnicalDamage.slopeFailure ? t.yes : t.no) +
        row(t.fields.origin, evaluation.geotechnicalDamage.origin) +
        row(t.fields.risk, risk(evaluation.geotechnicalDamage.risk)),
    ),
    section(
      6,
      evaluation.structuralDamage.elements
        .map((item) => row(t.damage[item.type as keyof typeof t.damage] ?? item.type, risk(item.severity)))
        .join('') +
        row(t.fields.worstFloor, evaluation.structuralDamage.worstFloor) +
        row(t.fields.risk, risk(evaluation.structuralDamage.risk)),
    ),
    section(
      7,
      evaluation.nonStructuralDamage.elements
        .map((item) => row(t.damage[item.type as keyof typeof t.damage] ?? item.type, risk(item.severity)))
        .join('') + row(t.fields.risk, risk(evaluation.nonStructuralDamage.risk)),
    ),
    section(
      8,
      evaluation.fieldCriteria
        .map((item) => row(t.damage[item.item as keyof typeof t.damage] ?? item.item, item.checked ? t.yes : t.no))
        .join(''),
    ),
    section(
      9,
      row(t.fields.globalDamage, `${evaluation.globalDamagePercentage}%`) +
        `<div class="classification ${evaluation.habitability}">${escape(t[evaluation.habitability])}</div>`,
    ),
    section(
      10,
      row(t.fields.preExisting, evaluation.preExistingConditions.present ? t.yes : t.no) +
        row(t.fields.description, evaluation.preExistingConditions.description) +
        row(t.fields.priorInterventions, evaluation.preExistingConditions.priorInterventions),
    ),
    section(
      11,
      row(t.fields.safetyMeasures, evaluation.recommendations.safetyMeasures.join(', ')) +
        row(t.fields.specialistVisits, evaluation.recommendations.specialistVisits.join(', ')) +
        row(t.fields.barriers, evaluation.recommendations.barriers) +
        row(t.fields.others, evaluation.recommendations.others),
    ),
    section(
      12,
      row(t.fields.injured, evaluation.occupantImpact.injured) +
        row(t.fields.deceased, evaluation.occupantImpact.deceased),
    ),
    section(
      13,
      row(t.fields.inhabited, evaluation.occupancy.inhabited ? t.yes : t.no) +
        row(t.fields.existingUnits, evaluation.occupancy.existingUnits) +
        row(t.fields.uninhabitableUnits, evaluation.occupancy.uninhabitableUnits),
    ),
    section(
      14,
      row(t.fields.contactName, evaluation.contact.name) +
        row(t.fields.identification, evaluation.contact.identification) +
        row(t.fields.phone, evaluation.contact.phone) +
        row(t.fields.contactAddress, evaluation.contact.address) +
        row(t.fields.comments, evaluation.comments),
    ),
    section(
      15,
      evaluation.inspectors
        .map(
          (inspector) =>
            `<div class="inspector">${row(t.fields.inspectorName, inspector.name)}${row(
              t.fields.profession,
              inspector.profession,
            )}${row(t.fields.license, inspector.license)}${row(t.fields.entity, inspector.entity)}</div>`,
        )
        .join(''),
    ),
    section(
      16,
      `<div class="evidence">
        <div class="drawing"><strong>${escape(t.sketch)}</strong>${
          evaluation.sketchUri
            ? `<img src="${escape(evaluation.sketchUri)}" alt="${escape(t.sketch)}">`
            : '<span>—</span>'
        }</div>
        <div class="drawing"><strong>${escape(t.signature)}</strong>${
          evaluation.signatureUri
            ? `<img src="${escape(evaluation.signatureUri)}" alt="${escape(t.signature)}">`
            : '<span>—</span>'
        }</div>
      </div>
      <div class="photos">${evaluation.photos
        .map(
          (photo, index) =>
            `<figure><img src="${escape(photo.localUri)}" alt="${escape(
              photo.caption || `${t.addPhoto} ${index + 1}`,
            )}"><figcaption>${escape(photo.caption || `${t.addPhoto} ${index + 1}`)}${
              photo.coordinates
                ? `<br>${photo.coordinates.latitude.toFixed(6)}, ${photo.coordinates.longitude.toFixed(6)}`
                : ''
            }</figcaption></figure>`,
        )
        .join('')}</div>`,
    ),
  ].join('');

  return `<!doctype html>
<html lang="${language}"><head><meta charset="utf-8"><style>
@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17251c;margin:0;font-size:11px}
header{display:flex;align-items:center;border-bottom:4px solid #176235;padding-bottom:14px;margin-bottom:18px}
.mark{width:54px;height:54px;border-radius:50%;background:#176235;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;margin-right:14px}
h1{color:#176235;font-size:24px;margin:0}.subtitle{color:#637068;margin-top:4px}.meta{margin-left:auto;text-align:right}
section{break-inside:avoid;border:1px solid #d9e2d8;border-radius:8px;margin:0 0 11px;overflow:hidden}
h2{background:#eef3ec;color:#0e4525;font-size:13px;margin:0;padding:9px 12px}.row{display:flex;border-top:1px solid #edf1ec;padding:6px 12px;gap:12px}
.row span{color:#637068;width:42%}.row strong{flex:1}.classification{padding:12px;color:#fff;font-weight:bold;text-transform:uppercase}
.habitable{background:#2d7a45}.restricted{background:#d69e00}.unsafe{background:#c43d32}.collapsed{background:#242824}
.inspector{margin:8px;border:1px solid #edf1ec;border-radius:5px}.evidence{display:flex;gap:12px;padding:12px}
.drawing{flex:1;min-height:120px;border:1px solid #d9e2d8;padding:8px}.drawing strong{display:block;color:#637068;margin-bottom:8px}.drawing img{width:100%;height:100px;object-fit:contain}
.photos{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:12px}.photos figure{margin:0;border:1px solid #d9e2d8;padding:6px;break-inside:avoid}.photos img{width:100%;height:180px;object-fit:contain}.photos figcaption{font-size:9px;color:#637068;margin-top:5px}
footer{text-align:center;color:#637068;margin-top:15px}
</style></head><body><header><div class="mark">EQ</div><div><h1>EVALQUAKE</h1><div class="subtitle">${escape(
    t.tagline,
  )}</div></div><div class="meta"><strong>${
    evaluation.officialNumber ? `N.º ${evaluation.officialNumber}` : escape(t.officialPending)
  }</strong><br>${escape(new Date(evaluation.inspectedAt).toLocaleString(language))}<br>${escape(
    evaluation.id,
  )}</div></header>${content}<footer>${escape(t.immutableNotice)}</footer></body></html>`;
}
