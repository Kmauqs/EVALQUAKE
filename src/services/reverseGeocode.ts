import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { Coordinates } from '@/domain/evaluation';
import {
  type NominatimResponse,
  type PlaceLookup,
  hasPlaceData,
  normalizeColombianName,
  parseNominatimAddress,
} from '@/domain/placeLookup';
import { APP_VERSION } from '@/version';

async function lookupNominatim(coordinates: Coordinates): Promise<PlaceLookup | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(coordinates.latitude));
  url.searchParams.set('lon', String(coordinates.longitude));
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', '18');
  url.searchParams.set('accept-language', 'es');

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (Platform.OS !== 'web') {
    headers['User-Agent'] = `EVALQUAKE/${APP_VERSION} (https://evalquake.web.app)`;
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) return null;
  return parseNominatimAddress((await response.json()) as NominatimResponse);
}

async function lookupExpo(coordinates: Coordinates): Promise<PlaceLookup | null> {
  try {
    const [place] = await Location.reverseGeocodeAsync({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });
    if (!place) return null;
    const department = normalizeColombianName(place.region ?? '');
    let municipality = normalizeColombianName(place.city ?? place.subregion ?? '');
    if (department === 'Bogotá D.C.' && !municipality) municipality = 'Bogotá D.C.';
    const road = [place.streetNumber, place.street].filter(Boolean).join(' ');
    return {
      department,
      municipality,
      commune: normalizeColombianName(place.district ?? ''),
      neighborhood: normalizeColombianName(place.name && place.name !== place.street ? place.name : ''),
      address: road || place.name || '',
    };
  } catch {
    return null;
  }
}

export async function lookupPlace(coordinates: Coordinates): Promise<PlaceLookup | null> {
  try {
    const osm = await lookupNominatim(coordinates);
    if (hasPlaceData(osm)) return osm;
  } catch {
    // Native geocoder is the fallback when OpenStreetMap is unavailable.
  }
  const native = await lookupExpo(coordinates);
  return hasPlaceData(native) ? native : null;
}
