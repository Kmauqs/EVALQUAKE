import { LocateFixed, MapPin, Maximize2, Minus, Plus } from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Evaluation } from '@/domain/evaluation';
import { captureCoordinates } from '@/services/device';
import { colors } from '@/theme';

type Point = { latitude: number; longitude: number };

const DEFAULT_CENTER: Point = { latitude: 4.625, longitude: -74.11 };
const BASE_LATITUDE_SPAN = 0.24;
const BASE_LONGITUDE_SPAN = 0.18;
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const touchDistance = (event: GestureResponderEvent) => {
  const [first, second] = event.nativeEvent.touches;
  if (!first || !second) return 0;
  return Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY);
};

export function EvaluationMap({
  evaluations,
  onSelect,
}: {
  evaluations: Evaluation[];
  onSelect: (evaluation: Evaluation) => void;
}) {
  const located = evaluations.filter((item) => item.identification.coordinates);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [size, setSize] = useState({ width: 1, height: 360 });
  const [currentLocation, setCurrentLocation] = useState<Point | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);
  const panOrigin = useRef(center);
  const pinchOrigin = useRef<{ distance: number; zoom: number } | null>(null);

  const updateCenter = (point: Point) => {
    centerRef.current = point;
    setCenter(point);
  };

  const updateZoom = (value: number) => {
    const next = clamp(value, MIN_ZOOM, MAX_ZOOM);
    zoomRef.current = next;
    setZoom(next);
  };

  const latitudeSpan = BASE_LATITUDE_SPAN / 2 ** (zoom - MIN_ZOOM);
  const longitudeSpan = BASE_LONGITUDE_SPAN / 2 ** (zoom - MIN_ZOOM);

  const fitMarkers = () => {
    const points = located.map((item) => item.identification.coordinates!);
    if (currentLocation) points.push(currentLocation);
    if (!points.length) {
      updateCenter(DEFAULT_CENTER);
      updateZoom(MIN_ZOOM);
      return;
    }

    const latitudes = points.map((point) => point.latitude);
    const longitudes = points.map((point) => point.longitude);
    const latitudeRange = Math.max(...latitudes) - Math.min(...latitudes);
    const longitudeRange = Math.max(...longitudes) - Math.min(...longitudes);
    const requiredScale = Math.max(
      latitudeRange / (BASE_LATITUDE_SPAN * 0.72),
      longitudeRange / (BASE_LONGITUDE_SPAN * 0.72),
      1 / 2 ** (MAX_ZOOM - MIN_ZOOM),
    );

    updateCenter({
      latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
      longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    });
    updateZoom(clamp(MIN_ZOOM - Math.log2(requiredScale), MIN_ZOOM, MAX_ZOOM));
  };

  const locateUser = async () => {
    setLocating(true);
    setLocationError(false);
    try {
      const coordinates = await captureCoordinates();
      const point = { latitude: coordinates.latitude, longitude: coordinates.longitude };
      setCurrentLocation(point);
      updateCenter(point);
      updateZoom(Math.max(zoomRef.current, 4));
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

          const spanScale = 2 ** (zoomRef.current - MIN_ZOOM);
          updateCenter({
            latitude:
              panOrigin.current.latitude +
              (gesture.dy / Math.max(size.height, 1)) * (BASE_LATITUDE_SPAN / spanScale),
            longitude:
              panOrigin.current.longitude -
              (gesture.dx / Math.max(size.width, 1)) * (BASE_LONGITUDE_SPAN / spanScale),
          });
        },
        onPanResponderRelease: () => {
          pinchOrigin.current = null;
        },
        onPanResponderTerminate: () => {
          pinchOrigin.current = null;
        },
      }),
    [size.height, size.width],
  );

  const positionFor = (point: Point) => ({
    top: `${50 - ((point.latitude - center.latitude) / latitudeSpan) * 100}%` as `${number}%`,
    left: `${50 + ((point.longitude - center.longitude) / longitudeSpan) * 100}%` as `${number}%`,
  });

  return (
    <View
      style={styles.map}
      onLayout={(event) => setSize(event.nativeEvent.layout)}
      {...panResponder.panHandlers}
    >
      <View style={[styles.road, styles.roadOne]} />
      <View style={[styles.road, styles.roadTwo]} />
      <View style={[styles.road, styles.roadThree]} />
      <Text style={styles.coordinates}>
        {center.latitude.toFixed(4)}, {center.longitude.toFixed(4)} · {zoom.toFixed(1)}×
      </Text>
      {located.map((evaluation) => {
        const coordinates = evaluation.identification.coordinates!;
        const color = {
          habitable: colors.green,
          restricted: colors.yellow,
          unsafe: colors.red,
          collapsed: colors.black,
        }[evaluation.habitability];
        return (
          <Pressable
            key={evaluation.id}
            accessibilityLabel={evaluation.building.address}
            onPress={() => onSelect(evaluation)}
            style={[styles.pin, positionFor(coordinates), { backgroundColor: color }]}
          >
            <MapPin size={16} color={colors.white} fill={colors.white} />
          </Pressable>
        );
      })}
      {currentLocation && (
        <View style={[styles.currentLocation, positionFor(currentLocation)]}>
          <View style={styles.currentLocationDot} />
        </View>
      )}

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
      {locationError && (
        <Text style={styles.locationError}>No se pudo obtener la ubicación / Location unavailable</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    minHeight: 360,
    borderRadius: 16,
    backgroundColor: '#E5ECE1',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  road: { position: 'absolute', height: 10, backgroundColor: '#F8FAF7', width: '130%', left: '-15%', borderWidth: 1, borderColor: '#D4DED1' },
  roadOne: { top: '32%', transform: [{ rotate: '-12deg' }] },
  roadTwo: { top: '66%', transform: [{ rotate: '18deg' }] },
  roadThree: { top: '48%', transform: [{ rotate: '73deg' }] },
  coordinates: { position: 'absolute', bottom: 12, left: 14, color: '#73816E', fontSize: 10, fontWeight: '700' },
  pin: {
    position: 'absolute',
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
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
  },
  currentLocationDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: colors.white,
  },
  controls: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 6,
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
    top: 12,
    color: colors.red,
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 11,
    fontWeight: '700',
  },
});
