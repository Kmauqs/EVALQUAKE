import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppShell, Card } from '@/components/ui';
import {
  guideBlocks,
  type GuideFigure,
  type GuideFigureRow,
} from '@/guide/content';
import { guideImageSize, guideImageSource } from '@/guide/images';
import { useI18n } from '@/i18n/I18nProvider';
import { useSafeBack } from '@/navigation/useSafeBack';
import { colors, layout } from '@/theme';

function useBoxWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = (event: { nativeEvent: { layout: { width: number } } }) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next > 0 && next !== width) setWidth(next);
  };
  return { width, onLayout };
}

function imageHeight(key: number, boxWidth: number, fallbackRatio: number) {
  const size = guideImageSize[key];
  const ratio = size ? size.width / size.height : fallbackRatio;
  return Math.max(120, Math.round((boxWidth || 280) / ratio));
}

function Figure({ figure }: { figure: GuideFigure }) {
  const source = guideImageSource(figure.key);
  const { width, onLayout } = useBoxWidth();
  if (!source) return null;
  const height = imageHeight(figure.key, width, 16 / 10);
  return (
    <View style={styles.figureWrap} onLayout={onLayout}>
      <Image
        accessibilityLabel={figure.caption}
        source={source}
        style={[styles.figure, { height }]}
        resizeMode="contain"
      />
      {figure.caption ? <Text style={styles.caption}>{figure.caption}</Text> : null}
    </View>
  );
}

function FigureRow({ row, stacked }: { row: GuideFigureRow; stacked: boolean }) {
  const { width, onLayout } = useBoxWidth();
  const columns = Math.max(1, row.keys.length);
  const gap = 8;
  const itemWidth = stacked || width === 0 ? width : Math.max(80, (width - gap * (columns - 1)) / columns);
  return (
    <View style={styles.figureRow}>
      <Text style={styles.rowTitle}>{row.title}</Text>
      <View style={[styles.rowImages, stacked && styles.rowImagesStacked]} onLayout={onLayout}>
        {row.keys.map((key, index) => {
          const source = guideImageSource(key);
          if (!source) return null;
          const height = imageHeight(key, stacked ? width : itemWidth, 1);
          return (
            <View key={key} style={stacked ? styles.rowItemStacked : styles.rowItem}>
              <Image
                accessibilityLabel={row.labels[index]}
                source={source}
                style={[styles.rowImage, { height }]}
                resizeMode="contain"
              />
              {row.labels[index] ? <Text style={styles.rowLabel}>{row.labels[index]}</Text> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function InspectionGuideScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const goBack = useSafeBack('/');
  const { width } = useWindowDimensions();
  const stacked = width < 720;
  const sections = guideBlocks(language);

  return (
    <AppShell>
      <View style={styles.top}>
        <Pressable onPress={goBack} style={styles.back} accessibilityLabel={t.back}>
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.kicker}>{t.guideKicker}</Text>
          <Text style={styles.title}>{t.guide}</Text>
        </View>
      </View>

      {sections.map((section) => (
        <Card key={section.id} style={styles.card}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.paragraphs?.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
          {section.bullets?.map((item) => (
            <Text key={item} style={styles.bullet}>
              • {item}
            </Text>
          ))}
          {section.figures?.map((figure) => (
            <Figure key={figure.key} figure={figure} />
          ))}
          {section.figureRows?.map((row) => (
            <FigureRow key={row.title} row={row} stacked={stacked} />
          ))}
          {section.groups?.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.bullets?.map((item) => (
                <Text key={item} style={styles.bullet}>
                  • {item}
                </Text>
              ))}
              {group.figures?.map((figure) => (
                <Figure key={figure.key} figure={figure} />
              ))}
              {group.figureRows?.map((row) => (
                <FigureRow key={row.title} row={row} stacked={stacked} />
              ))}
            </View>
          ))}
        </Card>
      ))}

      <Pressable onPress={() => router.replace('/')} style={styles.homeLink}>
        <Text style={styles.homeLinkText}>{t.back}</Text>
      </Pressable>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  top: {
    width: '100%',
    maxWidth: layout.contentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { flex: 1 },
  kicker: { color: colors.primary, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 2 },
  card: { width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center', marginTop: 12, gap: 10 },
  sectionTitle: { color: colors.primaryDark, fontSize: 18, fontWeight: '900' },
  paragraph: { color: colors.text, lineHeight: 22, fontSize: 15 },
  bullet: { color: colors.text, lineHeight: 22, fontSize: 15, paddingLeft: 4 },
  group: { gap: 8, marginTop: 8 },
  groupTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
  figureWrap: { gap: 6, marginTop: 4, width: '100%', alignSelf: 'stretch' },
  figure: { width: '100%', backgroundColor: colors.white, borderRadius: 8 },
  caption: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  figureRow: { gap: 8, marginTop: 8 },
  rowTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  rowImages: { flexDirection: 'row', gap: 8 },
  rowImagesStacked: { flexDirection: 'column' },
  rowItem: { flex: 1, gap: 4 },
  rowItemStacked: { width: '100%', gap: 4 },
  rowImage: { width: '100%', backgroundColor: colors.white, borderRadius: 8 },
  rowLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  homeLink: { alignSelf: 'center', marginVertical: 22 },
  homeLinkText: { color: colors.primary, fontWeight: '800' },
});
