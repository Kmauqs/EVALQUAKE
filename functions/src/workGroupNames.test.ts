import { describe, expect, it } from 'vitest';

import { nameKeyOf, normalizeName } from './workGroupNames';

describe('normalizeName', () => {
  it('collapses whitespace and trims', () => {
    expect(normalizeName('  Brigada   Norte \n')).toBe('Brigada Norte');
  });

  it('caps the length', () => {
    expect(normalizeName('a'.repeat(120))).toHaveLength(60);
  });
});

describe('nameKeyOf', () => {
  it('ignores case and accents so names cannot be duplicated', () => {
    expect(nameKeyOf('Brigada Nortë')).toBe(nameKeyOf(' brigada   NORTE '));
  });

  it('keeps distinct names distinct', () => {
    expect(nameKeyOf('Brigada Norte')).not.toBe(nameKeyOf('Brigada Sur'));
  });

  it('returns an empty key for blank input', () => {
    expect(nameKeyOf('   ')).toBe('');
  });
});
