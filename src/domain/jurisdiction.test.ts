import { describe, expect, it } from 'vitest';

import {
  DEMO_JURISDICTION_ID,
  hasNationalScope,
  resolveEvaluationJurisdiction,
} from './jurisdiction';

const assigned = [
  'Nacional',
  'Quindio',
  'Risaralda',
  'Valle del Cauca',
  'Armenia',
  'Pereira',
  'Cali',
  'Manizales',
];

describe('evaluation jurisdiction', () => {
  it('treats Nacional as event-wide scope', () => {
    expect(hasNationalScope(assigned)).toBe(true);
    expect(hasNationalScope(['Cali', 'Armenia'])).toBe(false);
  });

  it('prefers the municipality when it is one of the assigned jurisdictions', () => {
    expect(
      resolveEvaluationJurisdiction(assigned, { municipality: 'Cali', department: 'Valle del Cauca' }),
    ).toBe('Cali');
    expect(
      resolveEvaluationJurisdiction(assigned, { municipality: 'Quindío', department: '' }, 'Nacional'),
    ).toBe('Quindio');
  });

  it('falls back to the department, then Nacional, instead of the demo placeholder', () => {
    expect(
      resolveEvaluationJurisdiction(assigned, { municipality: 'Circasia', department: 'Quindío' }),
    ).toBe('Quindio');
    expect(resolveEvaluationJurisdiction(assigned, { municipality: '', department: '' })).toBe(
      'Nacional',
    );
    expect(resolveEvaluationJurisdiction(assigned, {}, DEMO_JURISDICTION_ID)).toBe('Nacional');
  });

  it('keeps the demo placeholder only when the account has no real jurisdictions', () => {
    expect(resolveEvaluationJurisdiction([], {}, DEMO_JURISDICTION_ID)).toBe(DEMO_JURISDICTION_ID);
    expect(resolveEvaluationJurisdiction(['Armenia'], {}, DEMO_JURISDICTION_ID)).toBe('Armenia');
  });
});
