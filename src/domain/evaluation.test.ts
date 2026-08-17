import { describe, expect, it } from 'vitest';

import {
  canSaveEvaluation,
  classificationColor,
  createEvaluation,
  validateForSubmission,
} from './evaluation';

describe('evaluation domain', () => {
  it('creates a deterministic complete draft shape', () => {
    const evaluation = createEvaluation('test-id', 'firebase-user-1', 'device-1');
    expect(evaluation.id).toBe('test-id');
    expect(evaluation.status).toBe('draft');
    expect(evaluation.currentSection).toBe(0);
    expect(evaluation.fieldCriteria).toHaveLength(4);
    expect(evaluation.structuralDamage.elements).toHaveLength(4);
    expect(evaluation.createdByUserId).toBe('firebase-user-1');
    expect(evaluation.deviceId).toBe('device-1');
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

  it('allows submission but rejects every subsequent overwrite', () => {
    const draft = createEvaluation('immutable-id');
    const submitted = { ...draft, status: 'submitted' as const };
    expect(canSaveEvaluation(draft, submitted)).toBe(true);
    expect(canSaveEvaluation(submitted, { ...submitted, comments: 'Changed' })).toBe(false);
    expect(canSaveEvaluation(submitted, { ...submitted, status: 'draft' })).toBe(false);
  });
});
