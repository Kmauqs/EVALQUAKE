import { describe, expect, it } from 'vitest';

import {
  canDeleteEvaluation,
  canSaveEvaluation,
  classificationColor,
  composeBuildingDimensions,
  createEvaluation,
  lastSectionIndex,
  normalizeEvaluation,
  sectionCountFor,
  validateForSubmission,
} from './evaluation';
import { deriveHabitability, needsEquipmentReview } from './catalog';

describe('evaluation domain', () => {
  it('creates a complete draft with the expanded ATC-20 element lists', () => {
    const evaluation = createEvaluation('test-id', 'firebase-user-1', 'device-1');
    expect(evaluation.id).toBe('test-id');
    expect(evaluation.status).toBe('draft');
    expect(evaluation.currentSection).toBe(0);
    expect(evaluation.structuralDamage.elements).toHaveLength(8);
    expect(evaluation.nonStructuralDamage.elements).toHaveLength(11);
    expect(evaluation.globalStability.conditions).toHaveLength(6);
    expect(evaluation.structure.irregularities).toHaveLength(5);
    expect(evaluation.createdByUserId).toBe('firebase-user-1');
    expect(evaluation.deviceId).toBe('device-1');
    expect(evaluation.repairQuantities.walls).toEqual([]);
    expect(sectionCountFor(evaluation)).toBe(17);
  });

  it('requires safety-critical fields before submission', () => {
    const evaluation = createEvaluation('test-id');
    expect(validateForSubmission(evaluation).success).toBe(false);
    evaluation.identification.department = 'Cundinamarca';
    evaluation.identification.municipality = 'Bogotá';
    evaluation.building.address = 'Calle 1 # 2-3';
    evaluation.inspectors[0]!.name = 'Inspector Demo';
    evaluation.signatureUri = 'data:image/svg+xml,signature';
    expect(validateForSubmission(evaluation).success).toBe(true);
  });

  it('maps habitability classes to official tag colors', () => {
    expect(classificationColor('habitable')).toBe('green');
    expect(classificationColor('restricted')).toBe('yellow');
    expect(classificationColor('unsafe')).toBe('red');
    expect(classificationColor('collapsed')).toBe('black');
  });

  it('derives occupancy class from the four risk ratings', () => {
    expect(deriveHabitability(['low', 'low', 'low', 'low'])).toBe('habitable');
    expect(deriveHabitability(['low', 'moderate', 'low', 'low'])).toBe('restricted');
    expect(deriveHabitability(['high', 'low', 'low', 'low'])).toBe('unsafe');
    expect(deriveHabitability(['high', 'high', 'low', 'low'])).toBe('collapsed');
    expect(deriveHabitability(['severe', 'low', 'low', 'low'])).toBe('collapsed');
    expect(deriveHabitability(['none', 'low', 'low', 'low'])).toBeNull();
  });

  it('adds the equipment checklist only for complete inspections of groups II-IV', () => {
    expect(needsEquipmentReview('complete', 'group_iii')).toBe(true);
    expect(needsEquipmentReview('complete', 'group_i')).toBe(false);
    expect(needsEquipmentReview('exterior_only', 'group_iii')).toBe(false);
    const evaluation = createEvaluation('eq-equip');
    evaluation.inspection.type = 'complete';
    evaluation.building.nsrGroup = 'group_ii';
    expect(sectionCountFor(evaluation)).toBe(18);
    expect(lastSectionIndex(evaluation)).toBe(17);
  });

  it('migrates legacy rapid inspections and wall damage into the new shape', () => {
    const legacy = createEvaluation('legacy');
    const migrated = normalizeEvaluation({
      ...legacy,
      inspection: { ...legacy.inspection, type: 'rapid' as never },
      structuralDamage: {
        ...legacy.structuralDamage,
        elements: [{ type: 'walls', severity: 'high', affectedPercentage: '40' }],
      },
      geotechnicalDamage: {
        ...legacy.geotechnicalDamage,
        settlement: true as never,
        slopeFailure: false as never,
      },
      fieldCriteria: [{ category: 'collapse', item: 'partialCollapse', checked: true }],
    });
    expect(migrated.inspection.type).toBe('exterior_only');
    expect(migrated.structuralDamage.elements.find((item) => item.type === 'structural_walls')?.severity).toBe(
      'high',
    );
    expect(migrated.geotechnicalDamage.settlement).toBe('punctual');
    expect(migrated.geotechnicalDamage.slopeFailure).toBe('none');
    expect(
      migrated.globalStability.conditions.find((item) => item.item === 'total_or_partial_collapse')?.checked,
    ).toBe(true);
  });

  it('fills ATC-20-1 fields missing from legacy drafts', () => {
    const legacy = createEvaluation('legacy-atc');
    const migrated = normalizeEvaluation({
      ...legacy,
      inspection: { type: 'complete', notInspectedReason: '', preliminaryClassification: '' },
      building: { ...legacy.building, storiesBelowGrade: undefined, length: undefined, width: undefined, height: undefined },
      structure: { ...legacy.structure, irregularities: undefined },
      recommendations: {
        safetyMeasures: [],
        specialistVisits: [],
        barriers: '',
        others: '',
      },
    } as never);
    expect(migrated.inspection.occupantsNotified).toBe(false);
    expect(migrated.building.storiesBelowGrade).toBe('');
    expect(migrated.building.length).toBe('');
    expect(migrated.building.width).toBe('');
    expect(migrated.building.height).toBe('');
    expect(migrated.structure.irregularities).toHaveLength(5);
    expect(migrated.recommendations.typicalRestrictions).toEqual([]);
    expect(migrated.recommendations.furtherActions).toEqual([]);
    expect(migrated.recommendations.utilitiesIsolated).toEqual({
      gas: false,
      electric: false,
      water: false,
    });
    expect(migrated.recommendations.adjacentFallingHazard).toBe(false);
  });

  it('composes approximate dimensions from length, width, and height', () => {
    expect(
      composeBuildingDimensions({ length: '12', width: '8', height: '6', dimensions: 'old' }),
    ).toBe('12 × 8 × 6 m');
    expect(composeBuildingDimensions({ length: '10', width: '', height: '', dimensions: '' })).toBe(
      '10 m',
    );
    expect(
      composeBuildingDimensions({ length: '', width: '', height: '', dimensions: '12 x 8 x 3 m' }),
    ).toBe('12 x 8 x 3 m');
  });

  it('allows submission but rejects every subsequent overwrite', () => {
    const draft = createEvaluation('immutable-id');
    const submitted = { ...draft, status: 'submitted' as const };
    expect(canSaveEvaluation(draft, submitted)).toBe(true);
    expect(canSaveEvaluation(submitted, { ...submitted, comments: 'Changed' })).toBe(false);
    expect(canSaveEvaluation(submitted, { ...submitted, status: 'draft' })).toBe(false);
  });

  it('allows deleting unsigned drafts and blocks signed or submitted evaluations', () => {
    const draft = createEvaluation('deletable-id');
    expect(canDeleteEvaluation(draft)).toBe(true);
    expect(canDeleteEvaluation({ ...draft, signatureUri: 'data:image/png,sig' })).toBe(false);
    expect(canDeleteEvaluation({ ...draft, status: 'submitted' })).toBe(false);
    expect(canDeleteEvaluation({ ...draft, status: 'synced' })).toBe(false);
    expect(canDeleteEvaluation({ ...draft, officialNumber: 12 })).toBe(false);
  });
});
