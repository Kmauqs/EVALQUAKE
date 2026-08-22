import { describe, expect, it } from 'vitest';

import { periodFromConstructionYear } from './catalog';

describe('periodFromConstructionYear', () => {
  it('maps a complete year to the Colombian code period', () => {
    expect(periodFromConstructionYear('1978')).toBe('before_1984');
    expect(periodFromConstructionYear('1984')).toBe('1984_1998');
    expect(periodFromConstructionYear('1997')).toBe('1984_1998');
    expect(periodFromConstructionYear('1998')).toBe('1998_2010');
    expect(periodFromConstructionYear('2009')).toBe('1998_2010');
    expect(periodFromConstructionYear('2010')).toBe('from_2010');
    expect(periodFromConstructionYear('2024')).toBe('from_2010');
  });

  it('does not guess while the year is incomplete or missing', () => {
    expect(periodFromConstructionYear('')).toBeNull();
    expect(periodFromConstructionYear('19')).toBeNull();
    expect(periodFromConstructionYear('199')).toBeNull();
    expect(periodFromConstructionYear('año 1998')).toBeNull();
    expect(periodFromConstructionYear('1200')).toBeNull();
  });
});
