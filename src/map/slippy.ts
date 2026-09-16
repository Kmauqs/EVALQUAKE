export type MapPoint = { latitude: number; longitude: number };
export type MapBaseLayer = 'topo' | 'satellite';

export const TILE_SIZE = 256;
export const MIN_ZOOM = 4;
export const MAX_ZOOM = 18;
export const DEFAULT_CENTER: MapPoint = { latitude: 4.625, longitude: -74.11 };
export const DEFAULT_ZOOM = 12;

const MAX_LATITUDE = 85.05112878;

export function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function lonToX(longitude: number, zoom: number) {
  return ((longitude + 180) / 360) * 2 ** zoom * TILE_SIZE;
}

export function latToY(latitude: number, zoom: number) {
  const clamped = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, latitude));
  const sine = Math.sin((clamped * Math.PI) / 180);
  return (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * 2 ** zoom * TILE_SIZE;
}

export function xToLon(x: number, zoom: number) {
  return (x / (2 ** zoom * TILE_SIZE)) * 360 - 180;
}

export function yToLat(y: number, zoom: number) {
  const n = Math.PI - (2 * Math.PI * y) / (2 ** zoom * TILE_SIZE);
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

export function wrapTileX(x: number, zoom: number) {
  const count = 2 ** Math.floor(zoom);
  return ((x % count) + count) % count;
}

export function tracestrackKey() {
  return process.env.EXPO_PUBLIC_TRACESTRACK_KEY?.trim() || '';
}

export function tileUrl(layer: MapBaseLayer, zoom: number, x: number, y: number, apiKey = tracestrackKey()) {
  const z = Math.floor(zoom);
  const column = wrapTileX(x, z);
  if (layer === 'satellite') {
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${column}`;
  }
  if (apiKey) {
    return `https://tile.tracestrack.com/topo_es/${z}/${column}/${y}.png?key=${encodeURIComponent(apiKey)}`;
  }
  return `https://tile.openstreetmap.org/${z}/${column}/${y}.png`;
}

export function visibleTiles(
  center: MapPoint,
  zoom: number,
  width: number,
  height: number,
): { z: number; x: number; y: number; left: number; top: number; size: number }[] {
  const integerZoom = Math.floor(zoom);
  const scale = 2 ** (zoom - integerZoom);
  const centerX = lonToX(center.longitude, integerZoom);
  const centerY = latToY(center.latitude, integerZoom);
  const tileCount = 2 ** integerZoom;
  const halfWidth = width / 2 / scale;
  const halfHeight = height / 2 / scale;
  const minX = Math.floor((centerX - halfWidth) / TILE_SIZE) - 1;
  const maxX = Math.floor((centerX + halfWidth) / TILE_SIZE) + 1;
  const minY = Math.max(0, Math.floor((centerY - halfHeight) / TILE_SIZE) - 1);
  const maxY = Math.min(tileCount - 1, Math.floor((centerY + halfHeight) / TILE_SIZE) + 1);
  const size = TILE_SIZE * scale;
  const tiles = [];

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      tiles.push({
        z: integerZoom,
        x,
        y,
        left: (x * TILE_SIZE - centerX) * scale + width / 2,
        top: (y * TILE_SIZE - centerY) * scale + height / 2,
        size,
      });
    }
  }
  return tiles;
}

export function projectPoint(point: MapPoint, center: MapPoint, zoom: number, width: number, height: number) {
  const integerZoom = Math.floor(zoom);
  const scale = 2 ** (zoom - integerZoom);
  return {
    left: (lonToX(point.longitude, integerZoom) - lonToX(center.longitude, integerZoom)) * scale + width / 2,
    top: (latToY(point.latitude, integerZoom) - latToY(center.latitude, integerZoom)) * scale + height / 2,
  };
}

export function panCenter(origin: MapPoint, zoom: number, dx: number, dy: number) {
  const integerZoom = Math.floor(zoom);
  const scale = 2 ** (zoom - integerZoom);
  return {
    longitude: xToLon(lonToX(origin.longitude, integerZoom) - dx / scale, integerZoom),
    latitude: yToLat(latToY(origin.latitude, integerZoom) - dy / scale, integerZoom),
  };
}

export function zoomForBounds(points: MapPoint[], width: number, height: number) {
  if (!points.length) return DEFAULT_ZOOM;
  if (points.length === 1) return 16;

  const lats = points.map((point) => point.latitude);
  const lons = points.map((point) => point.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const padWidth = Math.max(width * 0.72, 80);
  const padHeight = Math.max(height * 0.72, 80);

  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const spanX = Math.abs(lonToX(maxLon, zoom) - lonToX(minLon, zoom));
    const spanY = Math.abs(latToY(minLat, zoom) - latToY(maxLat, zoom));
    if (spanX <= padWidth && spanY <= padHeight) return zoom;
  }
  return MIN_ZOOM;
}

export function boundsCenter(points: MapPoint[]) {
  if (!points.length) return DEFAULT_CENTER;
  return {
    latitude: points.reduce((sum, point) => sum + point.latitude, 0) / points.length,
    longitude: points.reduce((sum, point) => sum + point.longitude, 0) / points.length,
  };
}
