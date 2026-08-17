import { MapPin } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Evaluation } from '@/domain/evaluation';
import { colors } from '@/theme';

export function EvaluationMap({
  evaluations,
  onSelect,
}: {
  evaluations: Evaluation[];
  onSelect: (evaluation: Evaluation) => void;
}) {
  const located = evaluations.filter((item) => item.identification.coordinates);
  const latitudes = located.map((item) => item.identification.coordinates!.latitude);
  const longitudes = located.map((item) => item.identification.coordinates!.longitude);
  const minLat = Math.min(...latitudes, 4.52);
  const maxLat = Math.max(...latitudes, 4.73);
  const minLng = Math.min(...longitudes, -74.18);
  const maxLng = Math.max(...longitudes, -74.04);

  return (
    <View style={styles.map}>
      <View style={[styles.road, styles.roadOne]} />
      <View style={[styles.road, styles.roadTwo]} />
      <View style={[styles.road, styles.roadThree]} />
      <Text style={styles.watermark}>BOGOTÁ D.C.</Text>
      {located.map((evaluation) => {
        const coordinates = evaluation.identification.coordinates!;
        const top = `${12 + (1 - (coordinates.latitude - minLat) / (maxLat - minLat || 1)) * 72}%` as `${number}%`;
        const left = `${10 + ((coordinates.longitude - minLng) / (maxLng - minLng || 1)) * 78}%` as `${number}%`;
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
            style={[styles.pin, { top, left, backgroundColor: color }]}
          >
            <MapPin size={16} color={colors.white} fill={colors.white} />
          </Pressable>
        );
      })}
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
  watermark: { position: 'absolute', bottom: 18, right: 20, color: '#B4C3AF', fontWeight: '900', letterSpacing: 2 },
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
});
