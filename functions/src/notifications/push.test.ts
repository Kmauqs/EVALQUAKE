import { describe, expect, it } from 'vitest';

import { isExpoPushToken } from './expoToken';

describe('isExpoPushToken', () => {
  it('accepts Expo push token formats', () => {
    expect(isExpoPushToken('ExponentPushToken[abc]')).toBe(true);
    expect(isExpoPushToken('ExpoPushToken[abc]')).toBe(true);
  });

  it('rejects empty or unrelated values', () => {
    expect(isExpoPushToken('')).toBe(false);
    expect(isExpoPushToken('fcm-token')).toBe(false);
    expect(isExpoPushToken(null)).toBe(false);
  });
});
