import { describe, expect, it } from 'vitest';

import { createEvaluation, type Evaluation } from './evaluation';
import {
  asWorkGroup,
  canModerateDeleteInScope,
  evaluationAuthorScope,
  isEvaluationInScope,
  managedWorkGroups,
  normalizeWorkGroupName,
  scopedWorkGroups,
  workGroupIdsFor,
  workGroupNameKey,
  workGroupNameTaken,
  type WorkGroup,
} from './workGroup';

function group(overrides: Partial<WorkGroup> & { id: string }): WorkGroup {
  return asWorkGroup(overrides.id, {
    name: overrides.name ?? overrides.id,
    coordinatorUids: overrides.coordinatorUids ?? [],
    memberUids: overrides.memberUids ?? [],
  });
}

function draftBy(uid: string): Evaluation {
  return createEvaluation('eval-1', uid, 'device-1');
}

describe('work group names', () => {
  it('collapses whitespace and trims', () => {
    expect(normalizeWorkGroupName('  Brigada   Norte  ')).toBe('Brigada Norte');
  });

  it('ignores case and accents when comparing names', () => {
    expect(workGroupNameKey('Brigada Nortë')).toBe(workGroupNameKey('  brigada   norte '));
  });

  it('detects duplicates but allows renaming the same group', () => {
    const groups = [group({ id: 'g1', name: 'Brigada Norte' })];
    expect(workGroupNameTaken(groups, 'brigada norte')).toBe(true);
    expect(workGroupNameTaken(groups, 'BRIGADA NORTE', 'g1')).toBe(false);
    expect(workGroupNameTaken(groups, 'Brigada Sur')).toBe(false);
  });
});

describe('membership', () => {
  const groups = [
    group({ id: 'g1', coordinatorUids: ['coord-a'], memberUids: ['ev-1', 'ev-2'] }),
    group({ id: 'g2', coordinatorUids: ['coord-b'], memberUids: ['ev-3'] }),
    group({ id: 'g3', coordinatorUids: ['coord-a', 'coord-b'], memberUids: ['ev-3'] }),
  ];

  it('lists the groups a coordinator manages', () => {
    expect(managedWorkGroups(groups, 'coord-a').map((item) => item.id)).toEqual(['g1', 'g3']);
  });

  it('gives an evaluator the groups they were assigned to', () => {
    expect(workGroupIdsFor(groups, 'ev-3')).toEqual(['g2', 'g3']);
    expect(workGroupIdsFor(groups, 'ev-nobody')).toEqual([]);
  });

  it('scopes admins to every group', () => {
    expect(scopedWorkGroups(groups, 'admin-1', 'admin')).toHaveLength(3);
  });
});

describe('evaluationAuthorScope', () => {
  const groups = [
    group({ id: 'g1', coordinatorUids: ['coord-a'], memberUids: ['ev-1', 'ev-2'] }),
    group({ id: 'g2', coordinatorUids: ['coord-b'], memberUids: ['ev-3'] }),
  ];

  it('is unrestricted for admins', () => {
    expect(evaluationAuthorScope(groups, 'admin-1', 'admin')).toBeNull();
  });

  it('covers the members of the groups a coordinator manages, plus themselves', () => {
    const scope = evaluationAuthorScope(groups, 'coord-a', 'coordinator');
    expect([...(scope ?? [])].sort()).toEqual(['coord-a', 'ev-1', 'ev-2']);
  });

  it('excludes authors outside the coordinator groups', () => {
    const scope = evaluationAuthorScope(groups, 'coord-a', 'coordinator');
    expect(isEvaluationInScope(draftBy('ev-3'), scope)).toBe(false);
    expect(isEvaluationInScope(draftBy('ev-1'), scope)).toBe(true);
  });

  it('leaves a coordinator without groups seeing only their own work', () => {
    const scope = evaluationAuthorScope(groups, 'coord-lonely', 'coordinator');
    expect([...(scope ?? [])]).toEqual(['coord-lonely']);
  });

  it('gives an evaluator their group mates', () => {
    const scope = evaluationAuthorScope(groups, 'ev-1', 'evaluator');
    expect([...(scope ?? [])].sort()).toEqual(['coord-a', 'ev-1', 'ev-2']);
  });
});

describe('canModerateDeleteInScope', () => {
  const groups = [group({ id: 'g1', coordinatorUids: ['coord-a'], memberUids: ['ev-1'] })];

  it('lets a coordinator delete an unused draft from their group', () => {
    expect(canModerateDeleteInScope(draftBy('ev-1'), 'coordinator', 'coord-a', groups)).toBe(true);
  });

  it('blocks a coordinator on a draft authored outside their groups', () => {
    expect(canModerateDeleteInScope(draftBy('ev-9'), 'coordinator', 'coord-a', groups)).toBe(false);
  });

  it('keeps the existing draft-only restriction for coordinators', () => {
    const submitted: Evaluation = { ...draftBy('ev-1'), status: 'submitted' };
    expect(canModerateDeleteInScope(submitted, 'coordinator', 'coord-a', groups)).toBe(false);
  });

  it('never restricts administrators', () => {
    expect(canModerateDeleteInScope(draftBy('ev-9'), 'admin', 'admin-1', [])).toBe(true);
  });

  it('refuses evaluators', () => {
    expect(canModerateDeleteInScope(draftBy('ev-1'), 'evaluator', 'ev-1', groups)).toBe(false);
  });
});
