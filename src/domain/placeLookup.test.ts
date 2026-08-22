import { describe, expect, it } from 'vitest';

import { createEvaluation } from './evaluation';
import { applyPlaceLookup, normalizeColombianName, parseNominatimAddress } from './placeLookup';

describe('place lookup', () => {
  it('normalizes Bogotá department names', () => {
    expect(normalizeColombianName('Bogota')).toBe('Bogotá D.C.');
    expect(normalizeColombianName('Bogotá, D.C.')).toBe('Bogotá D.C.');
    expect(normalizeColombianName('Distrito Capital de Bogotá')).toBe('Bogotá D.C.');
    expect(normalizeColombianName('Cundinamarca')).toBe('Cundinamarca');
  });

  it('maps a Bogotá Nominatim result to cadastral fields', () => {
    const place = parseNominatimAddress({
      display_name: 'Carrera 7, Chapinero, Bogotá, Colombia',
      address: {
        road: 'Carrera 7',
        house_number: '72-41',
        neighbourhood: 'El Chicó',
        suburb: 'Chapinero',
        city_district: 'Chapinero',
        city: 'Bogotá',
        state: 'Bogotá D.C.',
      },
    });
    expect(place).toEqual({
      department: 'Bogotá D.C.',
      municipality: 'Bogotá D.C.',
      commune: 'Chapinero',
      neighborhood: 'El Chicó',
      address: '72-41 Carrera 7',
    });
  });

  it('maps a municipal Nominatim result without inventing a commune', () => {
    const place = parseNominatimAddress({
      display_name: 'Calle 10, Armenia, Quindío, Colombia',
      address: {
        road: 'Calle 10',
        town: 'Armenia',
        state: 'Quindío',
      },
    });
    expect(place).toMatchObject({
      department: 'Quindío',
      municipality: 'Armenia',
      commune: '',
      neighborhood: '',
      address: 'Calle 10',
    });
  });

  it('applies lookup values without wiping fields the geocoder left empty', () => {
    const evaluation = createEvaluation('eq-test');
    evaluation.identification.department = 'Risaralda';
    evaluation.building.address = 'Carrera 1 # 2-3';
    const next = applyPlaceLookup(evaluation, {
      department: '',
      municipality: 'Pereira',
      commune: 'Cuba',
      neighborhood: '',
      address: '',
    });
    expect(next.identification.department).toBe('Risaralda');
    expect(next.identification.municipality).toBe('Pereira');
    expect(next.identification.commune).toBe('Cuba');
    expect(next.building.address).toBe('Carrera 1 # 2-3');
  });
});
