import { describe, expect, it } from 'vitest';

import { canAccessEvaluatorWorkspace } from './user';

describe('canAccessEvaluatorWorkspace', () => {
  it('allows evaluators and coordinators', () => {
    expect(canAccessEvaluatorWorkspace('evaluator')).toBe(true);
    expect(canAccessEvaluatorWorkspace('coordinator')).toBe(true);
  });

  it('denies admin-only and empty roles', () => {
    expect(canAccessEvaluatorWorkspace('admin')).toBe(false);
    expect(canAccessEvaluatorWorkspace(null)).toBe(false);
    expect(canAccessEvaluatorWorkspace(undefined)).toBe(false);
  });
});
