import type { Evaluation } from './evaluation';

export interface PlaceLookup {
  department: string;
  municipality: string;
  commune: string;
  neighborhood: string;
  address: string;
}

export type NominatimAddress = {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  quarter?: string;
  suburb?: string;
  hamlet?: string;
  city_district?: string;
  district?: string;
  borough?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
};

export type NominatimResponse = {
  display_name?: string;
  address?: NominatimAddress;
};

const emptyPlace = (): PlaceLookup => ({
  department: '',
  municipality: '',
  commune: '',
  neighborhood: '',
  address: '',
});

export function normalizeColombianName(value: string) {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  if (
    /bogot[aá]/i.test(trimmed) &&
    (/d\.?\s*c/i.test(trimmed) || /capital|distrito/i.test(trimmed) || /^bogot[aá]\b/i.test(trimmed))
  ) {
    return 'Bogotá D.C.';
  }
  return trimmed;
}

export function parseNominatimAddress(payload: NominatimResponse): PlaceLookup | null {
  const address = payload.address;
  if (!address) {
    return payload.display_name ? { ...emptyPlace(), address: payload.display_name.split(',')[0]!.trim() } : null;
  }

  const department = normalizeColombianName(address.state || address.region || '');
  let municipality = normalizeColombianName(
    address.city || address.town || address.village || address.municipality || '',
  );
  if (department === 'Bogotá D.C.' && !municipality) municipality = 'Bogotá D.C.';
  if (department === 'Bogotá D.C.' && /^bogot[aá]/i.test(municipality)) municipality = 'Bogotá D.C.';

  const neighborhood = normalizeColombianName(address.neighbourhood || address.quarter || address.hamlet || '');
  const commune = normalizeColombianName(
    address.city_district || address.district || address.borough || (neighborhood ? address.suburb : '') || '',
  );
  const road = [address.house_number, address.road || address.pedestrian].filter(Boolean).join(' ');
  const fallbackStreet = payload.display_name?.split(',')[0]?.trim() ?? '';

  return {
    department,
    municipality,
    commune: commune === neighborhood ? '' : commune,
    neighborhood: neighborhood || (commune ? '' : normalizeColombianName(address.suburb || '')),
    address: road || fallbackStreet,
  };
}

export function applyPlaceLookup(evaluation: Evaluation, place: PlaceLookup): Evaluation {
  const address = place.address || evaluation.building.address;
  return {
    ...evaluation,
    identification: {
      ...evaluation.identification,
      department: place.department || evaluation.identification.department,
      municipality: place.municipality || evaluation.identification.municipality,
      commune: place.commune || evaluation.identification.commune,
      neighborhood: place.neighborhood || evaluation.identification.neighborhood,
      sector: address || evaluation.identification.sector,
    },
    building: {
      ...evaluation.building,
      address,
    },
  };
}

export function hasPlaceData(place: PlaceLookup | null): place is PlaceLookup {
  return Boolean(
    place && (place.department || place.municipality || place.commune || place.neighborhood || place.address),
  );
}

export function cadastralStreet(evaluation: Evaluation) {
  const sector = evaluation.identification.sector.trim();
  if (sector) return sector;
  const address = evaluation.building.address.trim();
  return address.includes(', ') ? '' : address;
}

export function formatCadastralAddress(evaluation: Evaluation) {
  const { neighborhood, commune, municipality, department } = evaluation.identification;
  const parts = [cadastralStreet(evaluation), neighborhood, commune, municipality, department]
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const unique: string[] = [];
  for (const part of parts) {
    const key = normalizeColombianName(part).toLowerCase();
    if (!unique.some((seen) => normalizeColombianName(seen).toLowerCase() === key)) {
      unique.push(part);
    }
  }
  return unique.join(', ');
}

export function withBuildingAddressFromCadastral(evaluation: Evaluation): Evaluation {
  const composed = formatCadastralAddress(evaluation);
  if (!composed) return evaluation;
  const street = cadastralStreet(evaluation);
  const current = evaluation.building.address.trim();
  if (current && current !== street && current !== composed) return evaluation;
  if (current === composed) return evaluation;
  return {
    ...evaluation,
    building: { ...evaluation.building, address: composed },
  };
}
