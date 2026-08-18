import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useI18n } from '@/i18n/I18nProvider';
import { colors } from '@/theme';

interface Point {
  x: number;
  y: number;
  move?: boolean;
}

export function DrawPad({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value?: string) => void;
}) {
  const { t } = useI18n();
  const onChangeRef = useRef(onChange);
  const drawingRef = useRef(false);
  const [points, setPoints] = useState<Point[]>([]);

  const path = useMemo(
    () => points.map((point) => `${point.move ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' '),
    [points],
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!path) return;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240"><path d="${path}" fill="none" stroke="#176235" stroke-width="4" stroke-linecap="round"/></svg>`;
    onChangeRef.current(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  }, [path]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Pressable
          onPress={() => {
            setPoints([]);
            onChange(undefined);
          }}
        >
          <Text style={styles.clear}>{t.clear}</Text>
        </Pressable>
      </View>
      <View
        accessibilityLabel={label}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onMoveShouldSetResponderCapture={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) => {
          drawingRef.current = true;
          setPoints((current) => [
            ...current,
            { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY, move: true },
          ]);
        }}
        onResponderMove={(event) => {
          if (!drawingRef.current) return;
          setPoints((current) => [
            ...current,
            { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY },
          ]);
        }}
        onResponderRelease={() => {
          drawingRef.current = false;
        }}
        onResponderTerminate={() => {
          drawingRef.current = false;
        }}
        style={styles.pad}
      >
        {path ? (
          <Svg width="100%" height="100%" viewBox="0 0 640 240" preserveAspectRatio="none">
            <Path d={path} fill="none" stroke={colors.primary} strokeWidth={4} strokeLinecap="round" />
          </Svg>
        ) : value ? (
          <Image source={{ uri: value }} resizeMode="contain" style={styles.savedDrawing} />
        ) : (
          <Text style={styles.placeholder}>{t.drawHere}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, minWidth: 280, gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.text, fontSize: 13, fontWeight: '700' },
  clear: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  pad: {
    height: 180,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    touchAction: 'none',
  },
  savedDrawing: { width: '100%', height: '100%' },
  placeholder: { color: colors.textMuted, fontSize: 13 },
});
