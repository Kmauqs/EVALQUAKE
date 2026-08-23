import type { Evaluation, Language } from '../domain/evaluation';
import { sectionKeysFor } from '../domain/evaluation';
import type { EvaluationSectionKey } from '../domain/catalog';
import {
  formatMeasure,
  memberVolume,
  roofArea,
  totalMemberLength,
  totalMemberVolume,
  totalRoofArea,
  totalWallArea,
  wallArea,
} from '../domain/quantities';
import { formatCadastralAddress } from '../domain/placeLookup';
import { en, es, type Dictionary } from '../i18n/translations';
import { escapeHtml, wrapPrintableHtml } from './htmlChrome';

const escape = escapeHtml;

function catalogLabel(record: object | undefined, value: string) {
  if (!value) return '—';
  return (record as Record<string, string>)[value] || value;
}

export function renderReportHtml(evaluation: Evaluation, language: Language) {
  const t = language === 'es' ? es : en;
  const row = (label: string, value: unknown) =>
    `<div class="row"><span>${escape(label)}</span><strong>${escape(value || '—')}</strong></div>`;
  const section = (key: EvaluationSectionKey, index: number, content: string) =>
    `<section><h2>${index + 1}. ${escape(t.sections[key])}</h2>${content}</section>`;
  const risk = (value: string) => escape((t as Record<string, unknown>)[value] ?? value);
  const damageRow = (item: Evaluation['structuralDamage']['elements'][number]) =>
    row(
      t.damage[item.type as keyof typeof t.damage] ?? item.type,
      `${risk(item.severity)}${item.affectedPercentage ? ` · ${item.affectedPercentage}%` : ''}${
        item.notes ? ` — ${item.notes}` : ''
      }`,
    );

  const blocks: Record<EvaluationSectionKey, string> = {
    cadastral:
      row(t.fields.department, evaluation.identification.department) +
      row(t.fields.municipality, evaluation.identification.municipality) +
      row(t.fields.commune, evaluation.identification.commune) +
      row(t.fields.neighborhood, evaluation.identification.neighborhood) +
      row(t.address, evaluation.identification.sector || evaluation.building.address) +
      row(t.fields.cadastralCode, evaluation.identification.cadastralCode) +
      row(t.fields.propertyRegistration, evaluation.identification.propertyRegistration) +
      row(
        'GPS',
        evaluation.identification.coordinates
          ? `${evaluation.identification.coordinates.latitude.toFixed(6)}, ${evaluation.identification.coordinates.longitude.toFixed(6)}`
          : '',
      ),
    inspection:
      row(
        t.fields.inspectionType,
        catalogLabel(t.catalogs.inspectionTypes, evaluation.inspection.type),
      ) +
      row(t.fields.notInspectedReason, evaluation.inspection.notInspectedReason) +
      row(
        t.fields.preliminaryClassification,
        evaluation.inspection.preliminaryClassification
          ? t[evaluation.inspection.preliminaryClassification]
          : '',
      ) +
      row(t.fields.occupantsNotified, evaluation.inspection.occupantsNotified ? t.yes : t.no),
    building:
      row(t.address, evaluation.building.address || formatCadastralAddress(evaluation)) +
      row(t.fields.buildingName, evaluation.building.name) +
      row(t.fields.nsrGroup, catalogLabel(t.catalogs.nsrGroups, evaluation.building.nsrGroup)) +
      row(t.fields.floors, evaluation.building.floors) +
      row(t.fields.storiesBelowGrade, evaluation.building.storiesBelowGrade) +
      row(t.fields.predominantUse, evaluation.building.predominantUse) +
      (evaluation.building.length || evaluation.building.width || evaluation.building.height
        ? row(t.fields.dimensionLength, evaluation.building.length) +
          row(t.fields.dimensionWidth, evaluation.building.width) +
          row(t.fields.dimensionHeight, evaluation.building.height)
        : row(t.fields.dimensions, evaluation.building.dimensions)) +
      row(t.fields.footprintArea, evaluation.building.footprintArea) +
      row(t.fields.estimatedOccupants, evaluation.building.estimatedOccupants) +
      row(t.fields.units, evaluation.building.units),
    structure:
      row(
        t.fields.structuralSystem,
        catalogLabel(t.catalogs.structuralSystems, evaluation.structure.structuralSystem),
      ) +
      row(t.fields.floorType, catalogLabel(t.catalogs.floorTypes, evaluation.structure.floorType)) +
      row(
        t.fields.floorSubtype,
        catalogLabel(t.catalogs.floorSubtypes, evaluation.structure.floorSubtype),
      ) +
      row(
        t.fields.roofGeometry,
        catalogLabel(t.catalogs.roofGeometries, evaluation.structure.roofGeometry),
      ) +
      row(
        t.fields.roofStructure,
        catalogLabel(t.catalogs.roofStructures, evaluation.structure.roofStructure),
      ) +
      row(t.fields.constructionYear, evaluation.structure.constructionYear) +
      row(
        t.fields.constructionPeriod,
        catalogLabel(t.catalogs.constructionPeriods, evaluation.structure.constructionPeriod),
      ) +
      evaluation.structure.irregularities
        .map((item) =>
          row(
            t.catalogs.irregularities[item.item as keyof typeof t.catalogs.irregularities] ?? item.item,
            `${item.checked ? t.yes : t.no}${item.notes ? ` — ${item.notes}` : ''}`,
          ),
        )
        .join(''),
    globalStability:
      row(t.fields.risk, risk(evaluation.globalStability.risk)) +
      evaluation.globalStability.conditions
        .map((item) =>
          row(
            t.catalogs.globalConditions[item.item as keyof typeof t.catalogs.globalConditions] ??
              item.item,
            `${item.checked ? t.yes : t.no}${item.notes ? ` — ${item.notes}` : ''}`,
          ),
        )
        .join('') +
      row(t.fields.notes, evaluation.globalStability.notes),
    geotechnical:
      row(
        t.fields.morphology,
        catalogLabel(t.catalogs.morphologies, evaluation.geotechnicalDamage.morphology),
      ) +
      row(
        t.fields.settlement,
        catalogLabel(t.catalogs.settlementLevels, evaluation.geotechnicalDamage.settlement),
      ) +
      row(
        t.fields.slopeFailure,
        catalogLabel(t.catalogs.slopeFailureLevels, evaluation.geotechnicalDamage.slopeFailure),
      ) +
      row(t.fields.origin, catalogLabel(t.catalogs.origins, evaluation.geotechnicalDamage.origin)) +
      row(t.fields.risk, risk(evaluation.geotechnicalDamage.risk)),
    structuralDamage:
      evaluation.structuralDamage.elements.map(damageRow).join('') +
      row(t.fields.worstFloor, evaluation.structuralDamage.worstFloor) +
      row(t.fields.risk, risk(evaluation.structuralDamage.risk)),
    nonStructural:
      evaluation.nonStructuralDamage.elements.map(damageRow).join('') +
      row(t.fields.risk, risk(evaluation.nonStructuralDamage.risk)),
    equipment:
      evaluation.equipmentReview.items
        .filter((item) => item.damage || item.name || item.comments)
        .map((item) =>
          row(
            item.custom
              ? item.name || t.otherEquipment
              : (t.catalogs.equipment[item.type as keyof typeof t.catalogs.equipment] ?? item.type),
            `${catalogLabel(t.catalogs.equipmentDamage, item.damage)}${
              item.comments ? ` — ${item.comments}` : ''
            }`,
          ),
        )
        .join('') + row(t.fields.equipmentRecommendations, evaluation.equipmentReview.recommendations),
    habitability:
      row(
        t.fields.globalDamage,
        catalogLabel(t.catalogs.damageRanges, evaluation.globalDamagePercentage) ||
          evaluation.globalDamagePercentage,
      ) +
      `<div class="classification ${evaluation.habitability}">${escape(t[evaluation.habitability])}</div>` +
      `<p class="hint">${escape(t.habitabilityHints[evaluation.habitability])}</p>` +
      row(t.fields.placardComments, evaluation.placard.comments) +
      row(t.fields.placardRestrictions, evaluation.placard.restrictions) +
      row(t.fields.placardActions, evaluation.placard.furtherActions),
    preExisting:
      row(t.fields.preExisting, evaluation.preExistingConditions.present ? t.yes : t.no) +
      row(t.fields.description, evaluation.preExistingConditions.description) +
      row(t.fields.priorInterventions, evaluation.preExistingConditions.priorInterventions),
    recommendations:
      evaluation.recommendations.typicalRestrictions
        .map((item) =>
          row(
            t.catalogs.typicalRestrictions[item as keyof typeof t.catalogs.typicalRestrictions] ?? item,
            t.yes,
          ),
        )
        .join('') +
      evaluation.recommendations.furtherActions
        .map((item) =>
          row(t.catalogs.furtherActions[item as keyof typeof t.catalogs.furtherActions] ?? item, t.yes),
        )
        .join('') +
      row(
        t.catalogs.utilities.gas,
        evaluation.recommendations.utilitiesIsolated.gas ? t.yes : t.no,
      ) +
      row(
        t.catalogs.utilities.electric,
        evaluation.recommendations.utilitiesIsolated.electric ? t.yes : t.no,
      ) +
      row(
        t.catalogs.utilities.water,
        evaluation.recommendations.utilitiesIsolated.water ? t.yes : t.no,
      ) +
      row(
        t.fields.adjacentFallingHazard,
        `${evaluation.recommendations.adjacentFallingHazard ? t.yes : t.no}${
          evaluation.recommendations.adjacentNotes ? ` — ${evaluation.recommendations.adjacentNotes}` : ''
        }`,
      ) +
      row(t.fields.safetyMeasures, evaluation.recommendations.safetyMeasures.join(', ')) +
      row(t.fields.specialistVisits, evaluation.recommendations.specialistVisits.join(', ')) +
      row(t.fields.barriers, evaluation.recommendations.barriers) +
      row(t.fields.others, evaluation.recommendations.others),
    occupants:
      row(t.fields.injured, evaluation.occupantImpact.injured) +
      row(t.fields.deceased, evaluation.occupantImpact.deceased),
    occupancy:
      row(t.fields.inhabited, evaluation.occupancy.inhabited ? t.yes : t.no) +
      row(t.fields.existingUnits, evaluation.occupancy.existingUnits) +
      row(t.fields.uninhabitableUnits, evaluation.occupancy.uninhabitableUnits),
    contact:
      row(t.fields.contactName, evaluation.contact.name) +
      row(t.fields.identification, evaluation.contact.identification) +
      row(t.fields.phone, evaluation.contact.phone) +
      row(t.fields.contactAddress, evaluation.contact.address) +
      row(t.fields.comments, evaluation.comments),
    inspectors: evaluation.inspectors
      .map(
        (inspector) =>
          `<div class="inspector">${row(t.fields.inspectorName, inspector.name)}${row(
            t.fields.profession,
            inspector.profession,
          )}${row(t.fields.license, inspector.license)}${row(t.fields.entity, inspector.entity)}</div>`,
      )
      .join(''),
    quantities:
      `<p class="hint">${escape(t.hints.quantitiesOptional)}</p>` +
      evaluation.repairQuantities.walls
        .map((wall, index) =>
          row(
            `${t.quantityWalls} ${index + 1}`,
            `${wall.location || '—'} · ${formatMeasure(wallArea(wall))} m²`,
          ),
        )
        .join('') +
      evaluation.repairQuantities.roofs
        .map((roof, index) =>
          row(
            `${t.quantityRoofs} ${index + 1}`,
            `${roof.location || '—'} · ${formatMeasure(roofArea(roof))} m²`,
          ),
        )
        .join('') +
      evaluation.repairQuantities.beams
        .map((beam, index) =>
          row(
            `${t.quantityBeams} ${index + 1}`,
            `${beam.location || '—'} · ${formatMeasure(memberVolume(beam))} m³`,
          ),
        )
        .join('') +
      evaluation.repairQuantities.columns
        .map((column, index) =>
          row(
            `${t.quantityColumns} ${index + 1}`,
            `${column.location || '—'} · ${formatMeasure(memberVolume(column))} m³`,
          ),
        )
        .join('') +
      row(t.fields.quantityTotalWallArea, `${formatMeasure(totalWallArea(evaluation.repairQuantities.walls))} m²`) +
      row(t.fields.quantityTotalRoofArea, `${formatMeasure(totalRoofArea(evaluation.repairQuantities.roofs))} m²`) +
      row(
        `${t.quantityBeams} — ${t.fields.quantityTotalLength}`,
        `${formatMeasure(totalMemberLength(evaluation.repairQuantities.beams))} m`,
      ) +
      row(
        `${t.quantityBeams} — ${t.fields.quantityTotalVolume}`,
        `${formatMeasure(totalMemberVolume(evaluation.repairQuantities.beams))} m³`,
      ) +
      row(
        `${t.quantityColumns} — ${t.fields.quantityTotalLength}`,
        `${formatMeasure(totalMemberLength(evaluation.repairQuantities.columns))} m`,
      ) +
      row(
        `${t.quantityColumns} — ${t.fields.quantityTotalVolume}`,
        `${formatMeasure(totalMemberVolume(evaluation.repairQuantities.columns))} m³`,
      ),
    media: `<div class="evidence">
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
  };

  const content = sectionKeysFor(evaluation)
    .map((key, index) => section(key, index, blocks[key]))
    .join('');

  const documentHtml = `<!doctype html>
<html lang="${language}"><head><meta charset="utf-8"><title>EVALQUAKE — ${escape(
    evaluation.building.address || evaluation.id,
  )}</title><style>
@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17251c;margin:0;font-size:11px;background:#f5f8f3;padding:18px}
header{display:flex;align-items:center;border-bottom:4px solid #176235;padding-bottom:14px;margin-bottom:18px;background:#fff;padding:14px;border-radius:8px}
.mark{width:54px;height:54px;border-radius:50%;background:#176235;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;margin-right:14px}
h1{color:#176235;font-size:24px;margin:0}.subtitle{color:#637068;margin-top:4px}.meta{margin-left:auto;text-align:right}
section{break-inside:avoid;border:1px solid #d9e2d8;border-radius:8px;margin:0 0 11px;overflow:hidden;background:#fff}
h2{background:#eef3ec;color:#0e4525;font-size:13px;margin:0;padding:9px 12px}.row{display:flex;border-top:1px solid #edf1ec;padding:6px 12px;gap:12px}
.row span{color:#637068;width:42%}.row strong{flex:1}.classification{padding:12px;color:#fff;font-weight:bold;text-transform:uppercase}
.habitable{background:#2d7a45}.restricted{background:#d69e00}.unsafe{background:#c43d32}.collapsed{background:#242824}
.hint{margin:0;padding:8px 12px;color:#637068;font-size:11px}
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

  return wrapPrintableHtml(documentHtml, printLabel(t));
}

function printLabel(t: Dictionary) {
  return t.printPdf;
}
