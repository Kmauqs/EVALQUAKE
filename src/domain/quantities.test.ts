import { describe, expect, it } from 'vitest';

import { createEvaluation } from './evaluation';
import { es } from '@/i18n/translations';

import {
  createQuantityMember,
  createQuantityRoof,
  createQuantityWall,
  formatMeasure,
  normalizeRepairQuantities,
  parseMeasure,
  quantityCsvRows,
  roofArea,
  totalMemberLength,
  totalMemberVolume,
  wallArea,
} from './quantities';

describe('repair quantities', () => {
  it('parses decimal comma measures and computes wall and roof areas', () => {
    expect(parseMeasure('3,5')).toBe(3.5);
    expect(parseMeasure('')).toBe(0);
    const wall = createQuantityWall();
    wall.length = '4,2';
    wall.height = '2.5';
    expect(formatMeasure(wallArea(wall))).toBe('10.50');
    const roof = createQuantityRoof();
    roof.length = '6';
    roof.width = '4';
    expect(formatMeasure(roofArea(roof))).toBe('24.00');
  });

  it('totals beam length and volume', () => {
    const first = createQuantityMember();
    first.width = '0.3';
    first.depth = '0.4';
    first.length = '5';
    const second = createQuantityMember();
    second.width = '0.3';
    second.depth = '0.4';
    second.length = '3';
    expect(formatMeasure(totalMemberLength([first, second]))).toBe('8.00');
    expect(formatMeasure(totalMemberVolume([first, second]))).toBe('0.96');
  });

  it('keeps quantities optional on new evaluations', () => {
    const evaluation = createEvaluation('qty-draft');
    expect(evaluation.repairQuantities).toEqual({ walls: [], roofs: [], beams: [], columns: [] });
  });

  it('gives every quantity item an element location field', () => {
    expect(createQuantityWall().location).toBe('');
    expect(createQuantityRoof().location).toBe('');
    expect(createQuantityMember().location).toBe('');
    const migrated = normalizeRepairQuantities({
      walls: [{ ...createQuantityWall(), location: 'Muro norte' }],
      roofs: [{ ...createQuantityRoof(), location: undefined as never }],
      beams: [],
      columns: [],
    });
    expect(migrated.walls[0]?.location).toBe('Muro norte');
    expect(migrated.roofs[0]?.location).toBe('');
  });

  it('exports element location in the quantities CSV', () => {
    const evaluation = createEvaluation('qty-csv');
    const roof = createQuantityRoof();
    roof.location = 'Cubierta patio';
    roof.length = '6';
    roof.width = '4';
    const beam = createQuantityMember();
    beam.location = 'Viga eje B, piso 2';
    evaluation.repairQuantities = { walls: [], roofs: [roof], beams: [beam], columns: [] };
    const rows = quantityCsvRows(evaluation, es);
    expect(rows[0]).toContain(es.fields.quantityLocation);
    expect(rows.some((row) => row.includes('Cubierta patio'))).toBe(true);
    expect(rows.some((row) => row.includes('Viga eje B, piso 2'))).toBe(true);
  });
});
