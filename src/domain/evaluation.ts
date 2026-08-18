import { z } from 'zod';

import {
  GENERAL_EQUIPMENT_ITEMS,
  GLOBAL_CONDITIONS,
  HOSPITAL_EQUIPMENT_ITEMS,
  NON_STRUCTURAL_ELEMENTS,
  STRUCTURAL_ELEMENTS,
  STRUCTURAL_IRREGULARITIES,
  deriveHabitability,
  evaluationSectionKeys,
  migrateInspectionType,
  type ConstructionPeriod,
  type EvaluationSectionKey,
  type FloorType,
  type InspectionType,
  type NsrGroup,
  type StructuralSystemCode,
} from './catalog';

export type Language = 'es' | 'en';
export type UserRole = 'evaluator' | 'coordinator' | 'admin';
export type EvaluationStatus = 'draft' | 'submitted' | 'synced';
export type Habitability = 'habitable' | 'restricted' | 'unsafe' | 'collapsed';
export type RiskLevel = 'none' | 'low' | 'moderate' | 'high' | 'severe';
export type SyncState = 'local' | 'pending' | 'syncing' | 'synced' | 'error';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface DamageElement {
  type: string;
  severity: RiskLevel;
  affectedPercentage: string;
  notes?: string;
}

export interface ObservedCondition {
  item: string;
  checked: boolean;
  notes: string;
}

export interface EquipmentRow {
  type: string;
  group: 'general' | 'hospital';
  custom: boolean;
  name: string;
  damage: 'none' | 'moderate' | 'severe' | '';
  comments: string;
}

export interface Inspector {
  name: string;
  profession: string;
  license: string;
  inspectorId: string;
  entity: string;
}

export interface Attachment {
  id: string;
  localUri: string;
  storagePath?: string;
  sectionRef: string;
  caption?: string;
  coordinates?: Coordinates;
  syncState: SyncState;
}

export interface Evaluation {
  id: string;
  eventId: string;
  jurisdictionId: string;
  status: EvaluationStatus;
  syncState: SyncState;
  officialNumber: number | null;
  currentSection: number;
  identification: {
    department: string;
    municipality: string;
    commune: string;
    neighborhood: string;
    sector: string;
    cadastralCode: string;
    propertyRegistration: string;
    coordinates?: Coordinates;
  };
  inspection: {
    type: InspectionType | '';
    notInspectedReason: string;
    preliminaryClassification: Habitability | '';
    occupantsNotified: boolean;
  };
  building: {
    address: string;
    name: string;
    floors: string;
    storiesBelowGrade: string;
    predominantUse: string;
    dimensions: string;
    footprintArea: string;
    estimatedOccupants: string;
    units: string;
    nsrGroup: NsrGroup | '';
  };
  structure: {
    structuralSystem: StructuralSystemCode | '';
    floorType: FloorType | '';
    floorSubtype: string;
    floorSystem: string;
    roofGeometry: string;
    roofStructure: string;
    constructionYear: string;
    constructionPeriod: ConstructionPeriod | '';
    irregularities: ObservedCondition[];
  };
  globalStability: {
    conditions: ObservedCondition[];
    observedConditions: string[];
    risk: RiskLevel;
    notes: string;
  };
  geotechnicalDamage: {
    morphology: string;
    settlement: string;
    slopeFailure: string;
    origin: string;
    risk: RiskLevel;
  };
  structuralDamage: {
    elements: DamageElement[];
    worstFloor: string;
    risk: RiskLevel;
    suggestedMeasures: string[];
  };
  nonStructuralDamage: {
    elements: DamageElement[];
    risk: RiskLevel;
  };
  equipmentReview: {
    items: EquipmentRow[];
    recommendations: string;
  };
  fieldCriteria: { category: string; item: string; checked: boolean }[];
  globalDamagePercentage: string;
  habitability: Habitability;
  placard: {
    comments: string;
    restrictions: string;
    furtherActions: string;
    date: string;
    time: string;
    jurisdiction: string;
    inspectorLine: string;
  };
  preExistingConditions: {
    present: boolean;
    description: string;
    priorInterventions: string;
  };
  recommendations: {
    safetyMeasures: string[];
    specialistVisits: string[];
    barriers: string;
    others: string;
    typicalRestrictions: string[];
    furtherActions: string[];
    utilitiesIsolated: { gas: boolean; electric: boolean; water: boolean };
    adjacentFallingHazard: boolean;
    adjacentNotes: string;
  };
  occupantImpact: {
    injured: string;
    deceased: string;
  };
  occupancy: {
    inhabited: boolean;
    existingUnits: string;
    uninhabitableUnits: string;
  };
  contact: {
    name: string;
    identification: string;
    phone: string;
    address: string;
  };
  comments: string;
  inspectors: Inspector[];
  inspectedAt: string;
  photos: Attachment[];
  sketchUri?: string;
  sketchStoragePath?: string;
  signatureUri?: string;
  localPdfUri?: string;
  canonicalPdfStoragePath?: string;
  canonicalPdfState?: 'pending' | 'generating' | 'error' | 'ready';
  canonicalPdfError?: string;
  canonicalPdfLeaseUntil?: string;
  reportLanguage: Language;
  createdByUserId: string;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
}

const requiredText = z.string().trim().min(1);

export const submissionSchema = z.object({
  eventId: requiredText,
  jurisdictionId: requiredText,
  identification: z.object({
    department: requiredText,
    municipality: requiredText,
  }).passthrough(),
  building: z.object({
    address: requiredText,
  }).passthrough(),
  habitability: z.enum(['habitable', 'restricted', 'unsafe', 'collapsed']),
  inspectors: z.array(z.object({ name: requiredText }).passthrough()).min(1),
  signatureUri: requiredText,
}).passthrough();

function defaultDamage(types: readonly string[]): DamageElement[] {
  return types.map((type) => ({ type, severity: 'none', affectedPercentage: '' }));
}

function defaultConditions(): ObservedCondition[] {
  return GLOBAL_CONDITIONS.map((item) => ({ item, checked: false, notes: '' }));
}

function defaultIrregularities(): ObservedCondition[] {
  return STRUCTURAL_IRREGULARITIES.map((item) => ({ item, checked: false, notes: '' }));
}

function defaultEquipment(): EquipmentRow[] {
  return [
    ...GENERAL_EQUIPMENT_ITEMS.map((type) => ({
      type,
      group: 'general' as const,
      custom: false,
      name: '',
      damage: '' as const,
      comments: '',
    })),
    ...[1, 2, 3].map((index) => ({
      type: `other_general_${index}`,
      group: 'general' as const,
      custom: true,
      name: '',
      damage: '' as const,
      comments: '',
    })),
    ...HOSPITAL_EQUIPMENT_ITEMS.map((type) => ({
      type,
      group: 'hospital' as const,
      custom: false,
      name: '',
      damage: '' as const,
      comments: '',
    })),
    ...[1, 2].map((index) => ({
      type: `other_hospital_${index}`,
      group: 'hospital' as const,
      custom: true,
      name: '',
      damage: '' as const,
      comments: '',
    })),
  ];
}

export function createEvaluation(
  id = cryptoRandomId(),
  createdByUserId = 'demo-evaluator',
  deviceId = 'demo-device',
): Evaluation {
  const now = new Date().toISOString();
  return {
    id,
    eventId: 'event-2026',
    jurisdictionId: 'jurisdiction-demo',
    status: 'draft',
    syncState: 'local',
    officialNumber: null,
    currentSection: 0,
    identification: {
      department: '',
      municipality: '',
      commune: '',
      neighborhood: '',
      sector: '',
      cadastralCode: '',
      propertyRegistration: '',
    },
    inspection: { type: '', notInspectedReason: '', preliminaryClassification: '', occupantsNotified: false },
    building: {
      address: '',
      name: '',
      floors: '',
      storiesBelowGrade: '',
      predominantUse: '',
      dimensions: '',
      footprintArea: '',
      estimatedOccupants: '',
      units: '',
      nsrGroup: '',
    },
    structure: {
      structuralSystem: '',
      floorType: '',
      floorSubtype: '',
      floorSystem: '',
      roofGeometry: '',
      roofStructure: '',
      constructionYear: '',
      constructionPeriod: '',
      irregularities: defaultIrregularities(),
    },
    globalStability: { conditions: defaultConditions(), observedConditions: [], risk: 'none', notes: '' },
    geotechnicalDamage: {
      morphology: '',
      settlement: '',
      slopeFailure: '',
      origin: '',
      risk: 'none',
    },
    structuralDamage: {
      elements: defaultDamage(STRUCTURAL_ELEMENTS),
      worstFloor: '',
      risk: 'none',
      suggestedMeasures: [],
    },
    nonStructuralDamage: {
      elements: defaultDamage(NON_STRUCTURAL_ELEMENTS),
      risk: 'none',
    },
    equipmentReview: { items: defaultEquipment(), recommendations: '' },
    fieldCriteria: [],
    globalDamagePercentage: '',
    habitability: 'habitable',
    placard: {
      comments: '',
      restrictions: '',
      furtherActions: '',
      date: '',
      time: '',
      jurisdiction: '',
      inspectorLine: '',
    },
    preExistingConditions: { present: false, description: '', priorInterventions: '' },
    recommendations: {
      safetyMeasures: [],
      specialistVisits: [],
      barriers: '',
      others: '',
      typicalRestrictions: [],
      furtherActions: [],
      utilitiesIsolated: { gas: false, electric: false, water: false },
      adjacentFallingHazard: false,
      adjacentNotes: '',
    },
    occupantImpact: { injured: '0', deceased: '0' },
    occupancy: { inhabited: true, existingUnits: '', uninhabitableUnits: '0' },
    contact: { name: '', identification: '', phone: '', address: '' },
    comments: '',
    inspectors: [{ name: '', profession: '', license: '', inspectorId: '', entity: '' }],
    inspectedAt: now,
    photos: [],
    reportLanguage: 'es',
    createdByUserId,
    deviceId,
    createdAt: now,
    updatedAt: now,
  };
}

function mergeDamage(defaults: DamageElement[], existing?: DamageElement[]) {
  const mapped = (existing ?? []).map((item) =>
    item.type === 'walls' ? { ...item, type: 'structural_walls' } : item,
  );
  const byType = new Map(mapped.map((item) => [item.type, item]));
  const merged = defaults.map((item) => {
    const previous = byType.get(item.type);
    byType.delete(item.type);
    return previous
      ? {
          ...item,
          ...previous,
          type: item.type,
          affectedPercentage: previous.affectedPercentage ?? '',
        }
      : item;
  });
  return [...merged, ...byType.values()].map((item) => ({
    type: item.type,
    severity: item.severity ?? 'none',
    affectedPercentage: item.affectedPercentage ?? '',
    notes: item.notes,
  }));
}

function mergeObserved(defaults: ObservedCondition[], existing?: ObservedCondition[]) {
  return defaults.map((item) => {
    const previous = existing?.find((entry) => entry.item === item.item);
    return previous ? { ...item, checked: previous.checked, notes: previous.notes ?? '' } : item;
  });
}

function migrateSettlement(value: unknown) {
  if (value === true) return 'punctual';
  if (value === false) return 'none';
  return typeof value === 'string' ? value : '';
}

export function normalizeEvaluation(raw: Evaluation): Evaluation {
  const base = createEvaluation(raw.id, raw.createdByUserId, raw.deviceId);
  const inspectionType = migrateInspectionType(raw.inspection?.type);
  const existingConditions = raw.globalStability?.conditions;
  const fromCriteria = (raw.fieldCriteria ?? []).map((item) => ({
    item:
      item.item === 'partialCollapse'
        ? 'total_or_partial_collapse'
        : item.item === 'buildingLeaning'
          ? 'building_or_story_lean'
          : item.item === 'foundationMovement'
            ? 'building_settlement'
            : item.item === 'fallingHazards'
              ? 'falling_hazards_height'
              : item.item,
    checked: item.checked,
    notes: '',
  }));
  const conditions = GLOBAL_CONDITIONS.map((item) => {
    const previous = existingConditions?.find((entry) => entry.item === item);
    const fromLegacy = fromCriteria.find((entry) => entry.item === item);
    return {
      item,
      checked: Boolean(previous?.checked || fromLegacy?.checked),
      notes: previous?.notes || fromLegacy?.notes || '',
    };
  });

  return {
    ...base,
    ...raw,
    inspection: {
      ...base.inspection,
      ...raw.inspection,
      type: inspectionType,
      occupantsNotified: Boolean(raw.inspection?.occupantsNotified),
    },
    building: {
      ...base.building,
      ...raw.building,
      nsrGroup: raw.building?.nsrGroup ?? '',
      storiesBelowGrade: raw.building?.storiesBelowGrade ?? '',
    },
    structure: {
      ...base.structure,
      ...raw.structure,
      structuralSystem: raw.structure?.structuralSystem ?? '',
      floorType: raw.structure?.floorType ?? '',
      floorSubtype: raw.structure?.floorSubtype ?? '',
      roofGeometry: raw.structure?.roofGeometry ?? '',
      roofStructure: raw.structure?.roofStructure ?? '',
      constructionPeriod: raw.structure?.constructionPeriod ?? '',
      irregularities: mergeObserved(base.structure.irregularities, raw.structure?.irregularities),
    },
    globalStability: {
      ...base.globalStability,
      ...raw.globalStability,
      conditions,
      observedConditions: raw.globalStability?.observedConditions ?? [],
    },
    geotechnicalDamage: {
      ...base.geotechnicalDamage,
      ...raw.geotechnicalDamage,
      settlement: migrateSettlement(raw.geotechnicalDamage?.settlement),
      slopeFailure: migrateSettlement(raw.geotechnicalDamage?.slopeFailure),
    },
    structuralDamage: {
      ...base.structuralDamage,
      ...raw.structuralDamage,
      elements: mergeDamage(base.structuralDamage.elements, raw.structuralDamage?.elements),
    },
    nonStructuralDamage: {
      ...base.nonStructuralDamage,
      ...raw.nonStructuralDamage,
      elements: mergeDamage(base.nonStructuralDamage.elements, raw.nonStructuralDamage?.elements),
    },
    equipmentReview: {
      items: raw.equipmentReview?.items?.length ? raw.equipmentReview.items : base.equipmentReview.items,
      recommendations: raw.equipmentReview?.recommendations ?? '',
    },
    fieldCriteria: raw.fieldCriteria ?? [],
    placard: {
      ...base.placard,
      ...raw.placard,
    },
    recommendations: {
      ...base.recommendations,
      ...raw.recommendations,
      typicalRestrictions: raw.recommendations?.typicalRestrictions ?? [],
      furtherActions: raw.recommendations?.furtherActions ?? [],
      utilitiesIsolated: {
        ...base.recommendations.utilitiesIsolated,
        ...raw.recommendations?.utilitiesIsolated,
      },
      adjacentFallingHazard: Boolean(raw.recommendations?.adjacentFallingHazard),
      adjacentNotes: raw.recommendations?.adjacentNotes ?? '',
    },
    inspectors: raw.inspectors?.length ? raw.inspectors : base.inspectors,
    photos: raw.photos ?? [],
  };
}

export function applyDerivedHabitability(evaluation: Evaluation): Evaluation {
  const derived = deriveHabitability([
    evaluation.globalStability.risk,
    evaluation.geotechnicalDamage.risk,
    evaluation.structuralDamage.risk,
    evaluation.nonStructuralDamage.risk,
  ]);
  return derived ? { ...evaluation, habitability: derived } : evaluation;
}

export function sectionKeysFor(evaluation: Evaluation): EvaluationSectionKey[] {
  return evaluationSectionKeys(evaluation.inspection.type, evaluation.building.nsrGroup);
}

export function sectionCountFor(evaluation: Evaluation) {
  return sectionKeysFor(evaluation).length;
}

export function lastSectionIndex(evaluation: Evaluation) {
  return Math.max(0, sectionCountFor(evaluation) - 1);
}

export function validateForSubmission(evaluation: Evaluation) {
  return submissionSchema.safeParse(evaluation);
}

export function canSaveEvaluation(existing: Evaluation | null, next: Evaluation) {
  if (!existing) return true;
  if (existing.id !== next.id) return false;
  return existing.status === 'draft';
}

export function classificationColor(value: Habitability) {
  return {
    habitable: 'green',
    restricted: 'yellow',
    unsafe: 'red',
    collapsed: 'black',
  }[value] as 'green' | 'yellow' | 'red' | 'black';
}

export function cryptoRandomId() {
  const random = Math.random().toString(36).slice(2);
  return `eq-${Date.now().toString(36)}-${random}`;
}
