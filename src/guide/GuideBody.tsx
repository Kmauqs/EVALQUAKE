import { ChevronDown, ChevronRight } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import type { GuideBlock, GuideFigure, GuideFigureRow } from '@/guide/content';
import { guideImageSize, guideImageSource } from '@/guide/images';
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

function collectOpenIds(sections: GuideBlock[]) {
  const ids = new Set<string>();
  for (const section of sections) {
    ids.add(section.id);
    for (const row of section.figureRows ?? []) ids.add(`${section.id}/row/${row.title}`);
    for (const group of section.groups ?? []) {
      const groupId = `${section.id}/group/${group.title}`;
      ids.add(groupId);
      for (const row of group.figureRows ?? []) ids.add(`${groupId}/row/${row.title}`);
    }
  }
  return ids;
}

function CollapseToggle({
  title,
  open,
  onToggle,
  titleStyle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  titleStyle: object;
}) {
  const Icon = open ? ChevronDown : ChevronRight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={title}
      onPress={onToggle}
      style={styles.collapseHeader}
    >
      <Icon size={20} color={colors.primary} />
      <Text style={[titleStyle, styles.collapseTitle]}>{title}</Text>
    </Pressable>
  );
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

function FigureRow({
  row,
  stacked,
  open,
  onToggle,
}: {
  row: GuideFigureRow;
  stacked: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const { width, onLayout } = useBoxWidth();
  const columns = Math.max(1, row.keys.length);
  const gap = 8;
  const itemWidth = stacked || width === 0 ? width : Math.max(80, (width - gap * (columns - 1)) / columns);
  return (
    <View style={styles.figureRow}>
      <CollapseToggle title={row.title} open={open} onToggle={onToggle} titleStyle={styles.rowTitle} />
      {open ? (
        <View style={[styles.rowImages, stacked && styles.rowImagesStacked]} onLayout={onLayout}>
          {row.keys.map((key, index) => {
            const source = guideImageSource(key);
            if (!source) return null;
            const height = imageHeight(key, stacked ? width : itemWidth, 1);
            return (
              <View key={`${key}-${index}`} style={stacked ? styles.rowItemStacked : styles.rowItem}>
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
      ) : null}
    </View>
  );
}

export function GuideBody({
  sections,
  stacked,
  defaultOpen = false,
  fillWidth = false,
}: {
  sections: GuideBlock[];
  stacked: boolean;
  defaultOpen?: boolean;
  fillWidth?: boolean;
}) {
  const signature = sections.map((section) => section.id).join('|');
  const [openIds, setOpenIds] = useState<Set<string>>(() => (defaultOpen ? collectOpenIds(sections) : new Set()));

  React.useEffect(() => {
    if (defaultOpen) setOpenIds(collectOpenIds(sections));
  }, [defaultOpen, signature, sections]);

  const isOpen = useCallback((id: string) => openIds.has(id), [openIds]);
  const toggle = useCallback((id: string) => {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const cardStyle = useMemo(
    () => [styles.card, fillWidth && styles.cardFill],
    [fillWidth],
  );

  return (
    <>
      {sections.map((section) => {
        const sectionOpen = isOpen(section.id);
        return (
          <Card key={section.id} style={[cardStyle, !sectionOpen && styles.cardCollapsed]}>
            <CollapseToggle
              title={section.title}
              open={sectionOpen}
              onToggle={() => toggle(section.id)}
              titleStyle={styles.sectionTitle}
            />
            {sectionOpen ? (
              <>
                {section.paragraphs?.map((paragraph, index) => (
                  <Text key={`${section.id}-p-${index}`} style={styles.paragraph}>
                    {paragraph}
                  </Text>
                ))}
                {section.bullets?.map((item, index) => (
                  <Text key={`${section.id}-b-${index}`} style={styles.bullet}>
                    • {item}
                  </Text>
                ))}
                {section.figures?.map((figure) => (
                  <Figure key={figure.key} figure={figure} />
                ))}
                {section.figureRows?.map((row) => {
                  const rowId = `${section.id}/row/${row.title}`;
                  return (
                    <FigureRow
                      key={rowId}
                      row={row}
                      stacked={stacked}
                      open={isOpen(rowId)}
                      onToggle={() => toggle(rowId)}
                    />
                  );
                })}
                {section.groups?.map((group) => {
                  const groupId = `${section.id}/group/${group.title}`;
                  const groupOpen = isOpen(groupId);
                  return (
                    <View key={groupId} style={styles.group}>
                      <CollapseToggle
                        title={group.title}
                        open={groupOpen}
                        onToggle={() => toggle(groupId)}
                        titleStyle={styles.groupTitle}
                      />
                      {groupOpen ? (
                        <>
                          {group.paragraphs?.map((paragraph, index) => (
                            <Text key={`${groupId}-p-${index}`} style={styles.paragraph}>
                              {paragraph}
                            </Text>
                          ))}
                          {group.bullets?.map((item, index) => (
                            <Text key={`${groupId}-b-${index}`} style={styles.bullet}>
                              • {item}
                            </Text>
                          ))}
                          {group.figures?.map((figure) => (
                            <Figure key={figure.key} figure={figure} />
                          ))}
                          {group.figureRows?.map((row) => {
                            const rowId = `${groupId}/row/${row.title}`;
                            return (
                              <FigureRow
                                key={rowId}
                                row={row}
                                stacked={stacked}
                                open={isOpen(rowId)}
                                onToggle={() => toggle(rowId)}
                              />
                            );
                          })}
                        </>
                      ) : null}
                    </View>
                  );
                })}
              </>
            ) : null}
          </Card>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: layout.contentWidth, alignSelf: 'center', marginTop: 12, gap: 10 },
  cardFill: { maxWidth: '100%' },
  cardCollapsed: { gap: 0 },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    minHeight: 44,
    paddingVertical: 4,
  },
  collapseTitle: { flex: 1, minWidth: 0 },
  sectionTitle: { color: colors.primaryDark, fontSize: 18, fontWeight: '900', lineHeight: 24 },
  paragraph: { color: colors.text, lineHeight: 22, fontSize: 15 },
  bullet: { color: colors.text, lineHeight: 22, fontSize: 15, paddingLeft: 4 },
  group: { gap: 8, marginTop: 8 },
  groupTitle: { color: colors.text, fontWeight: '800', fontSize: 16, lineHeight: 22 },
  figureWrap: { gap: 6, marginTop: 4, width: '100%', alignSelf: 'stretch' },
  figure: { width: '100%', backgroundColor: colors.white, borderRadius: 8 },
  caption: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  figureRow: { gap: 8, marginTop: 8 },
  rowTitle: { color: colors.text, fontWeight: '700', fontSize: 14, lineHeight: 20 },
  rowImages: { flexDirection: 'row', gap: 8 },
  rowImagesStacked: { flexDirection: 'column' },
  rowItem: { flex: 1, gap: 4 },
  rowItemStacked: { width: '100%', gap: 4 },
  rowImage: { width: '100%', backgroundColor: colors.white, borderRadius: 8 },
  rowLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
