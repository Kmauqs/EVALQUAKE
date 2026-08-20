import { describe, expect, it } from 'vitest';

import {
  boundsCenter,
  clampZoom,
  latToY,
  lonToX,
  panCenter,
  projectPoint,
  tileUrl,
  wrapTileX,
  xToLon,
  yToLat,
  zoomForBounds,
} from './slippy';

describe('slippy map tiles', () => {
  it('round-trips Bogotá coordinates through the Web Mercator projection', () => {
    const zoom = 12;
    const longitude = -74.0721;
    const latitude = 4.711;
    expect(xToLon(lonToX(longitude, zoom), zoom)).toBeCloseTo(longitude, 5);
    expect(yToLat(latToY(latitude, zoom), zoom)).toBeCloseTo(latitude, 5);
  });

  it('wraps tile columns around the antimeridian', () => {
    expect(wrapTileX(-1, 3)).toBe(7);
    expect(wrapTileX(8, 3)).toBe(0);
  });

  it('builds Tracestrack topography URLs when an API key is present', () => {
    expect(tileUrl('topo', 12, 1205, 1973, 'demo-key')).toBe(
      'https://tile.tracestrack.com/topo_es/12/1205/1973.png?key=demo-key',
    );
  });

  it('falls back to OpenStreetMap tiles without a Tracestrack key', () => {
    expect(tileUrl('topo', 12, 1205, 1973, '')).toBe('https://tile.openstreetmap.org/12/1205/1973.png');
  });

  it('uses Esri World Imagery for the satellite layer', () => {
    expect(tileUrl('satellite', 12, 1205, 1973)).toBe(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/12/1973/1205',
    );
  });

  it('pans west when the map is dragged to the right', () => {
    const origin = { latitude: 4.6, longitude: -74.1 };
    const next = panCenter(origin, 12, 80, 0);
    expect(next.longitude).toBeLessThan(origin.longitude);
    expect(next.latitude).toBeCloseTo(origin.latitude, 4);
  });

  it('projects a point at the map center to the middle of the viewport', () => {
    const center = { latitude: 4.65, longitude: -74.08 };
    const position = projectPoint(center, center, 13, 400, 360);
    expect(position.left).toBeCloseTo(200, 5);
    expect(position.top).toBeCloseTo(180, 5);
  });

  it('fits a single marker at street zoom and many markers at a wider zoom', () => {
    expect(zoomForBounds([{ latitude: 4.65, longitude: -74.08 }], 640, 360)).toBe(16);
    const fitted = zoomForBounds(
      [
        { latitude: 4.55, longitude: -74.14 },
        { latitude: 4.72, longitude: -74.05 },
      ],
      640,
      360,
    );
    expect(fitted).toBeGreaterThanOrEqual(10);
    expect(fitted).toBeLessThan(16);
  });

  it('clamps zoom and averages a bounding-box center', () => {
    expect(clampZoom(1)).toBe(4);
    expect(clampZoom(22)).toBe(18);
    expect(boundsCenter([
      { latitude: 4, longitude: -74 },
      { latitude: 6, longitude: -76 },
    ])).toEqual({ latitude: 5, longitude: -75 });
  });
});
