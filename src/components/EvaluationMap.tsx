import { Layers, LocateFixed, MapPin, Maximize2, Minus, Mountain, Plus, Satellite } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Evaluation, Habitability } from '@/domain/evaluation';
import { classificationColor } from '@/domain/evaluation';
import { useI18n } from '@/i18n/I18nProvider';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  type MapBaseLayer,
  type MapPoint,
  boundsCenter,
  clampZoom,
  panCenter,
  projectPoint,
  tileUrl,
  tracestrackKey,
  visibleTiles,
  zoomForBounds,
} from '@/map/slippy';
import { captureCoordinates } from '@/services/device';
import { colors } from '@/theme';
import { APP_VERSION } from '@/version';

const HABITABILITY_ORDER: Habitability[] = ['habitable', 'restricted', 'unsafe', 'collapsed'];

const touchDistance = (event: GestureResponderEvent) => {
  const [first, second] = event.nativeEvent.touches;
  if (!first || !second) return 0;
  return Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);
};

const tileSource = (uri: string) =>
  Platform.OS === 'web'
    ? { uri }
    : { uri, headers: { 'User-Agent': `EVALQUAKE/${APP_VERSION} (https://evalquake.web.app)` } };

export function EvaluationMap({
  evaluations,
  onSelect,
}: {
  evaluations: Evaluation[];
  onSelect: (evaluation: Evaluation) => void;
}) {
  const { t } = useI18n();
  const located = evaluations.filter((item) => item.identification.coordinates);
  const [layer, setLayer] = useState<MapBaseLayer>('topo');
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [size, setSize] = useState({ width: 1, height: 420 });
  const [currentLocation, setCurrentLocation] = useState<MapPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);
  const panOrigin = useRef(center);
  const pinchOrigin = useRef<{ distance: number; zoom: number } | null>(null);
  const fitted = useRef(false);

  const updateCenter = (point: MapPoint) => {
    centerRef.current = point;
    setCenter(point);
  };

  const updateZoom = (value: number) => {
    const next = clampZoom(value);
    zoomRef.current = next;
    setZoom(next);
  };

  const markerPoints = useMemo(() => {
    const points = located.map((item) => item.identification.coordinates!);
    if (currentLocation) points.push(currentLocation);
    return points;
  }, [currentLocation, located]);

  const fitMarkers = () => {
    if (!markerPoints.length) {
      updateCenter(DEFAULT_CENTER);
      updateZoom(DEFAULT_ZOOM);
      return;
    }
    updateCenter(boundsCenter(markerPoints));
    updateZoom(zoomForBounds(markerPoints, size.width, size.height));
  };

  useEffect(() => {
    if (fitted.current || size.width < 8 || !located.length) return;
    fitted.current = true;
    const points = located.map((item) => item.identification.coordinates!);
    updateCenter(boundsCenter(points));
    updateZoom(zoomForBounds(points, size.width, size.height));
  }, [located, size.height, size.width]);

  const locateUser = async () => {
    setLocating(true);
    setLocationError(false);
    try {
      const coordinates = await captureCoordinates();
      const point = { latitude: coordinates.latitude, longitude: coordinates.longitude };
      setCurrentLocation(point);
      updateCenter(point);
      updateZoom(Math.max(zoomRef.current, 16));
    } catch {
      setLocationError(true);
    } finally {
      setLocating(false);
    }
  };

  const panResponder = useMemo(
    () =>
      // The responder only reads refs inside gesture callbacks, never during render.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onMoveShouldSetPanResponder: (event, gesture) =>
          event.nativeEvent.touches.length >= 2 || Math.abs(gesture.dx) + Math.abs(gesture.dy) > 5,
        onPanResponderGrant: (event) => {
          panOrigin.current = centerRef.current;
          const distance = touchDistance(event);
          pinchOrigin.current = distance ? { distance, zoom: zoomRef.current } : null;
        },
        onPanResponderMove: (event, gesture) => {
          if (event.nativeEvent.touches.length >= 2) {
            const distance = touchDistance(event);
            if (!pinchOrigin.current && distance) {
              pinchOrigin.current = { distance, zoom: zoomRef.current };
            }
            if (pinchOrigin.current && distance) {
              updateZoom(pinchOrigin.current.zoom + Math.log2(distance / pinchOrigin.current.distance));
            }
            return;
          }
          updateCenter(panCenter(panOrigin.current, zoomRef.current, gesture.dx, gesture.dy));
        },
        onPanResponderRelease: () => {
          pinchOrigin.current = null;
        },
        onPanResponderTerminate: () => {
          pinchOrigin.current = null;
        },
      }),
    [],
  );

  const tiles = visibleTiles(center, zoom, size.width, size.height);
  const nextLayer: MapBaseLayer = layer === 'topo' ? 'satellite' : 'topo';
  const hasTracestrack = Boolean(tracestrackKey());
  const topoLabel = hasTracestrack ? t.mapTopo : t.mapOsm;
  const topoAttribution = hasTracestrack ? t.mapAttributionTopo : t.mapAttributionOsm;

  return (
    <View
      style={[styles.map, Platform.OS === 'web' ? ({ touchAction: 'none', cursor: 'grab' } as object) : undefined]}
      onLayout={(event) => setSize(event.nativeEvent.layout)}
      {...panResponder.panHandlers}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {tiles.map((tile) => (
          <Image
            key={`${layer}-${tile.z}-${tile.x}-${tile.y}`}
            source={tileSource(tileUrl(layer, tile.z, tile.x, tile.y))}
            style={{
              position: 'absolute',
              left: tile.left,
              top: tile.top,
              width: tile.size,
              height: tile.size,
            }}
          />
        ))}
      </View>

      {located.map((evaluation) => {
        const coordinates = evaluation.identification.coordinates!;
        const position = projectPoint(coordinates, center, zoom, size.width, size.height);
        const color = colors[classificationColor(evaluation.habitability)];
        return (
          <Pressable
            key={evaluation.id}
            accessibilityLabel={`${evaluation.building.address} · ${t[evaluation.habitability]}`}
            onPress={() => onSelect(evaluation)}
            style={[styles.pin, { left: position.left, top: position.top, backgroundColor: color }]}
          >
            <MapPin size={16} color={colors.white} fill={colors.white} />
          </Pressable>
        );
      })}

      {currentLocation && (
        <View
          style={[
            styles.currentLocation,
            projectPoint(currentLocation, center, zoom, size.width, size.height),
          ]}
        >
          <View style={styles.currentLocationDot} />
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.mapSwitchLayer}
        onPress={() => setLayer(nextLayer)}
        style={styles.layerButton}
      >
        <Layers size={16} color={colors.primary} />
        {layer === 'topo' ? (
          <Mountain size={16} color={colors.primary} />
        ) : (
          <Satellite size={16} color={colors.primary} />
        )}
        <Text style={styles.layerButtonText}>{layer === 'topo' ? topoLabel : t.mapSatellite}</Text>
      </Pressable>

      <View style={styles.controls}>
        <Pressable
          accessibilityLabel="Acercar / Zoom in"
          onPress={() => updateZoom(zoomRef.current + 1)}
          style={styles.control}
        >
          <Plus size={20} color={colors.primary} />
        </Pressable>
        <Pressable
          accessibilityLabel="Alejar / Zoom out"
          onPress={() => updateZoom(zoomRef.current - 1)}
          style={styles.control}
        >
          <Minus size={20} color={colors.primary} />
        </Pressable>
        <Pressable
          accessibilityLabel="Mostrar todos / Show all"
          onPress={fitMarkers}
          style={styles.control}
        >
          <Maximize2 size={18} color={colors.primary} />
        </Pressable>
        <Pressable
          accessibilityLabel="Mi ubicación / My location"
          onPress={() => void locateUser()}
          disabled={locating}
          style={[styles.control, locating && styles.controlDisabled]}
        >
          {locating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <LocateFixed size={18} color={colors.primary} />
          )}
        </Pressable>
      </View>

      {locationError && <Text style={styles.locationError}>{t.mapLocateError}</Text>}

      <View style={styles.footer} pointerEvents="none">
        <View style={styles.legend}>
          {HABITABILITY_ORDER.map((value) => (
            <View key={value} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors[classificationColor(value)] }]} />
              <Text style={styles.legendText}>{t[value]}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.attribution}>
          {layer === 'topo' ? topoAttribution : t.mapAttributionSatellite}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    minHeight: 420,
    height: 480,
    borderRadius: 16,
    backgroundColor: '#D7E0D4',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pin: {
    position: 'absolute',
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    zIndex: 2,
  },
  currentLocation: {
    position: 'absolute',
    width: 24,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    borderRadius: 12,
    backgroundColor: '#3B82F640',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  currentLocationDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: colors.white,
  },
  layerButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 3,
    maxWidth: '58%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  layerButtonText: { color: colors.primary, fontWeight: '800', fontSize: 12, flexShrink: 1 },
  controls: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 6,
    zIndex: 3,
  },
  control: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlDisabled: { opacity: 0.65 },
  locationError: {
    position: 'absolute',
    left: 12,
    right: 62,
    top: 56,
    color: colors.red,
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: '700',
    zIndex: 3,
  },
  footer: {
    position: 'absolute',
    left: 10,
    right: 58,
    bottom: 10,
    gap: 6,
    zIndex: 3,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#FFFFFFF2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.white },
  legendText: { color: colors.text, fontSize: 10, fontWeight: '700' },
  attribution: {
    color: '#2F3B32',
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: '#FFFFFFD8',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
});
