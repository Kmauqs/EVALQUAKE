import { useRouter } from 'expo-router';
import { ArrowLeft, Download, FileJson, Search } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { EvaluationMap } from '@/components/EvaluationMap';
import { AppShell, Button, Card, ClassificationBadge } from '@/components/ui';
import { useAuth } from '@/auth/AuthProvider';
import type { Evaluation, Habitability } from '@/domain/evaluation';
import { demoEvaluations } from '@/domain/fixtures';
import { subscribeRemoteEvaluations } from '@/firebase/repository';
import { useI18n } from '@/i18n/I18nProvider';
import { useSafeBack } from '@/navigation/useSafeBack';
import { exportCsv, exportJson } from '@/services/exportData';
import { useEvaluations } from '@/state/EvaluationProvider';
import { colors } from '@/theme';

export default function CoordinatorDashboard() {
  const { t, language } = useI18n();
  const { configured, jurisdictionIds } = useAuth();
  const { evaluations: local } = useEvaluations();
  const router = useRouter();
  const goBack = useSafeBack('/');
  const { width } = useWindowDimensions();
  const narrow = width < 700;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Habitability | 'all'>('all');
  const [remote, setRemote] = useState<Evaluation[]>([]);
  useEffect(
    () =>
      configured
        ? subscribeRemoteEvaluations(jurisdictionIds, 'event-2026', setRemote)
        : () => undefined,
    [configured, jurisdictionIds],
  );
  const evaluations = useMemo(
    () =>
      configured
        ? remote
        : [
            ...local.filter((item) => !demoEvaluations.some((demo) => demo.id === item.id)),
            ...demoEvaluations,
          ],
    [configured, local, remote],
  );
  const filtered = evaluations.filter((evaluation) => {
    const haystack = [
      evaluation.building.address,
      evaluation.identification.neighborhood,
      evaluation.inspectors[0]?.name,
    ]
      .join(' ')
      .toLowerCase();
    return (filter === 'all' || evaluation.habitability === filter) && haystack.includes(query.toLowerCase());
  });
  const classifications: Habitability[] = ['habitable', 'restricted', 'unsafe', 'collapsed'];

  return (
    <AppShell>
      <View style={[styles.titleRow, narrow && styles.titleRowNarrow]}>
        <Pressable onPress={goBack} style={styles.back}>
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{t.coordinator}</Text>
          <Text style={[styles.title, narrow && styles.titleNarrow]}>{t.dashboard}</Text>
          <Text style={styles.subtitle}>{t.currentEvent}</Text>
        </View>
        <View style={[styles.exports, narrow && styles.exportsNarrow]}>
          <Button
            variant="ghost"
            icon={<Download size={17} color={colors.primary} />}
            onPress={() => void exportCsv(filtered)}
            style={narrow ? styles.exportButtonNarrow : undefined}
          >
            {t.exportCsv}
          </Button>
          <Button
            variant="secondary"
            icon={<FileJson size={17} color={colors.primary} />}
            onPress={() => void exportJson(filtered)}
            style={narrow ? styles.exportButtonNarrow : undefined}
          >
            {t.exportJson}
          </Button>
        </View>
      </View>

      <View style={styles.stats}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{evaluations.length}</Text>
          <Text style={styles.statLabel}>{t.totalEvaluations}</Text>
        </Card>
        {classifications.map((classification) => (
          <Pressable key={classification} style={styles.statPressable} onPress={() => setFilter(classification)}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>
                {evaluations.filter((item) => item.habitability === classification).length}
              </Text>
              <ClassificationBadge value={classification} compact />
            </Card>
          </Pressable>
        ))}
      </View>

      <View style={styles.filters}>
        <View style={styles.search}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.search}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.filterChips}>
          {(['all', ...classifications] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setFilter(value)}
              style={[styles.filterChip, filter === value && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
                {value === 'all' ? t.all : t[value]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.content, width < 960 && styles.contentNarrow]}>
        <View style={styles.mapColumn}>
          <Text style={styles.sectionTitle}>{t.map}</Text>
          <EvaluationMap
            evaluations={filtered}
            onSelect={(evaluation) => router.push(`/(coordinator)/evaluation/${evaluation.id}`)}
          />
        </View>
        <View style={styles.listColumn}>
          <Text style={styles.sectionTitle}>{t.recentEvaluations}</Text>
          <View style={styles.list}>
            {filtered.map((evaluation) => (
              <Pressable
                key={evaluation.id}
                onPress={() => router.push(`/(coordinator)/evaluation/${evaluation.id}`)}
              >
                <Card style={styles.row}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowNumber}>
                      {evaluation.officialNumber ? `#${evaluation.officialNumber}` : t.officialPending}
                    </Text>
                    <ClassificationBadge value={evaluation.habitability} compact />
                  </View>
                  <Text style={styles.rowAddress}>{evaluation.building.address}</Text>
                  <Text style={styles.rowMeta}>
                    {evaluation.identification.neighborhood} · {evaluation.inspectors[0]?.name}
                  </Text>
                  <Text style={styles.rowDate}>
                    {new Date(evaluation.updatedAt).toLocaleString(language)}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, marginTop: 8 },
  titleRowNarrow: { flexWrap: 'wrap' },
  back: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.primary, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 3 },
  titleNarrow: { fontSize: 27, lineHeight: 33 },
  subtitle: { color: colors.textMuted, marginTop: 4 },
  exports: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  exportsNarrow: { width: '100%', flexDirection: 'column', paddingLeft: 57, alignItems: 'stretch' },
  exportButtonNarrow: { width: '100%' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  statPressable: { minWidth: 150, flex: 1 },
  statCard: { minWidth: 140, flex: 1, minHeight: 100, justifyContent: 'center', gap: 8 },
  statValue: { color: colors.text, fontSize: 26, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontWeight: '700' },
  filters: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  search: { flex: 1, minWidth: 280, height: 48, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  searchInput: { flex: 1, color: colors.text, height: '100%' },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  filterTextActive: { color: colors.white },
  content: { flexDirection: 'row', gap: 18, marginTop: 22, paddingBottom: 30 },
  contentNarrow: { flexDirection: 'column' },
  mapColumn: { flex: 1.45, minWidth: 0 },
  listColumn: { flex: 1, minWidth: 300 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 10 },
  list: { gap: 9 },
  row: { padding: 15 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowNumber: { color: colors.primary, fontWeight: '900', fontSize: 12 },
  rowAddress: { color: colors.text, fontWeight: '800', marginTop: 10 },
  rowMeta: { color: colors.textMuted, fontSize: 12, marginTop: 5 },
  rowDate: { color: colors.textMuted, fontSize: 10, marginTop: 8 },
});
