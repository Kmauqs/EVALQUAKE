import { describe, expect, it } from 'vitest';

import { guideBlocks, inspectionPointHints } from './content';

describe('inspection guide', () => {
  it('keeps the same section ids in Spanish and English', () => {
    const spanish = guideBlocks('es');
    const english = guideBlocks('en');
    expect(spanish.map((section) => section.id)).toEqual(english.map((section) => section.id));
    expect(spanish.length).toBeGreaterThan(5);
  });

  it('keeps matching inspection-point hints in both languages', () => {
    expect(Object.keys(inspectionPointHints.es)).toEqual(Object.keys(inspectionPointHints.en));
  });
});
