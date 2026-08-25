import { describe, expect, it } from 'vitest';

import { isUnread, parseAppNotification } from './notification';

describe('parseAppNotification', () => {
  it('parses a valid notification document', () => {
    const parsed = parseAppNotification('n1', {
      type: 'user.approved',
      title: 'Cuenta autorizada',
      body: 'Tu rol es evaluator',
      href: '/',
      readAt: null,
      createdAt: '2026-08-24T12:00:00.000Z',
      dedupeKey: 'user.approved:uid:evaluator',
      meta: { userId: 'uid' },
    });
    expect(parsed?.type).toBe('user.approved');
    expect(parsed?.title).toBe('Cuenta autorizada');
    expect(isUnread(parsed!)).toBe(true);
  });

  it('rejects unknown types', () => {
    expect(parseAppNotification('n1', { type: 'other', title: 'x', body: 'y' })).toBeNull();
  });
});
