import { z } from 'zod';

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
  notes?: string;
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

export interface Inspector {
  name: string;
  profession: string;
  license: string;
  inspectorId: string;
  entity: string;
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
    type: 'rapid' | 'detailed';
    notInspectedReason: string;
    preliminaryClassification: Habitability | '';
  };
  building: {
    address: string;
    name: string;
    floors: string;
    predominantUse: string;
    dimensions: string;
    footprintArea: string;
    estimatedOccupants: string;
    units: string;
  };
  structure: {
    structuralSystem: string;
    floorSystem: string;
    constructionYear: string;
  };
  globalStability: {
    observedConditions: string[];
    risk: RiskLevel;
    notes: string;
  };
  geotechnicalDamage: {
    morphology: string;
    settlement: boolean;
    slopeFailure: boolean;
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
  fieldCriteria: Array<{ category: string; item: string; checked: boolean }>;
  globalDamagePercentage: string;
  habitability: Habitability;
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

export interface Event {
  id: string;
  name: string;
  jurisdictionIds: string[];
  startsAt: string;
  active: boolean;
}

export interface AuditEntry {
  id: string;
  evaluationId: string;
  changedBy: string;
  reason: string;
  patch: Partial<Evaluation>;
  createdAt: string;
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
    inspection: { type: 'rapid', notInspectedReason: '', preliminaryClassification: '' },
    building: {
      address: '',
      name: '',
      floors: '',
      predominantUse: '',
      dimensions: '',
      footprintArea: '',
      estimatedOccupants: '',
      units: '',
    },
    structure: { structuralSystem: '', floorSystem: '', constructionYear: '' },
    globalStability: { observedConditions: [], risk: 'none', notes: '' },
    geotechnicalDamage: {
      morphology: '',
      settlement: false,
      slopeFailure: false,
      origin: '',
      risk: 'none',
    },
    structuralDamage: {
      elements: [
        { type: 'columns', severity: 'none' },
        { type: 'beams', severity: 'none' },
        { type: 'walls', severity: 'none' },
        { type: 'floors', severity: 'none' },
      ],
      worstFloor: '',
      risk: 'none',
      suggestedMeasures: [],
    },
    nonStructuralDamage: {
      elements: [
        { type: 'facades', severity: 'none' },
        { type: 'ceilings', severity: 'none' },
        { type: 'stairs', severity: 'none' },
        { type: 'utilities', severity: 'none' },
      ],
      risk: 'none',
    },
    fieldCriteria: [
      { category: 'collapse', item: 'partialCollapse', checked: false },
      { category: 'leaning', item: 'buildingLeaning', checked: false },
      { category: 'foundation', item: 'foundationMovement', checked: false },
      { category: 'falling', item: 'fallingHazards', checked: false },
    ],
    globalDamagePercentage: '0',
    habitability: 'habitable',
    preExistingConditions: { present: false, description: '', priorInterventions: '' },
    recommendations: { safetyMeasures: [], specialistVisits: [], barriers: '', others: '' },
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
