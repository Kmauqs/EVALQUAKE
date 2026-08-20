import { useRouter } from 'expo-router';
import { ArrowLeft, Building2, Plus, RotateCw, Trash2 } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppShell, Button, Card, ClassificationBadge, OfflinePill } from '@/components/ui';
import { canDeleteEvaluation, sectionCountFor } from '@/domain/evaluation';
import { useI18n } from '@/i18n/I18nProvider';
import { useSafeBack } from '@/navigation/useSafeBack';
import { confirmDestructive } from '@/services/confirm';
import { useEvaluations } from '@/state/EvaluationProvider';
import { colors } from '@/theme';

export default function EvaluatorHome() {
  const { t, language } = useI18n();
  const { evaluations, loading, create, remove } = useEvaluations();
  const router = useRouter();
  const goBack = useSafeBack('/');
  const { width } = useWindowDimensions();
  const narrow = width < 600;

  const createNew = async () => {
    const evaluation = await create();
    router.push(`/(evaluator)/evaluation/${evaluation.id}`);
  };

  const requestDelete = (id: string) => {
    confirmDestructive(
      t.deleteEvaluationTitle,
      t.deleteEvaluationConfirm,
      t.deleteEvaluation,
      t.cancel,
      () => {
        void remove(id).catch(() => Alert.alert(t.deleteEvaluationTitle, t.deleteFailed));
      },
    );
  };

  return (
    <AppShell>
      <View style={[styles.topRow, narrow && styles.topRowNarrow]}>
        <Pressable onPress={goBack} style={styles.back}>
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{t.evaluator}</Text>
          <Text style={[styles.title, narrow && styles.titleNarrow]}>{t.myEvaluations}</Text>
          <Text style={styles.event}>{t.currentEvent}</Text>
        </View>
        <View style={[styles.offlineWrap, narrow && styles.offlineWrapNarrow]}>
          <OfflinePill />
        </View>
      </View>

      <Button icon={<Plus size={19} color={colors.white} />} onPress={createNew} style={styles.newButton}>
        {t.newEvaluation}
      </Button>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : evaluations.length === 0 ? (
        <Card style={styles.empty}>
          <Building2 color={colors.mint} size={48} />
          <Text style={styles.emptyTitle}>{t.noEvaluations}</Text>
          <Text style={styles.emptyText}>{t.evaluatorDescription}</Text>
        </Card>
      ) : (
        <View style={styles.list}>
          {evaluations.map((evaluation) => (
            <Card key={evaluation.id} style={styles.item}>
              <Pressable
                onPress={() => router.push(`/(evaluator)/evaluation/${evaluation.id}`)}
                style={styles.itemMain}
              >
                <View style={styles.itemIcon}>
                  <Building2 size={22} color={colors.primary} />
                </View>
                <View style={styles.itemCopy}>
                  <Text style={styles.address}>
                    {evaluation.building.address || `${t.draft} · ${evaluation.id.slice(-6).toUpperCase()}`}
                  </Text>
                  <Text style={styles.meta}>
                    {evaluation.identification.neighborhood || t.currentEvent} ·{' '}
                    {new Date(evaluation.updatedAt).toLocaleDateString(language)}
                  </Text>
                  <View style={styles.progressLine}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${((evaluation.currentSection + 1) / sectionCountFor(evaluation)) * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              </Pressable>
              <View style={styles.itemStatus}>
                <ClassificationBadge value={evaluation.habitability} compact />
                <View style={styles.sync}>
                  <RotateCw size={12} color={colors.textMuted} />
                  <Text style={styles.syncText}>
                    {evaluation.syncState === 'synced' ? t.synced : t.pendingSync}
                  </Text>
                </View>
                {canDeleteEvaluation(evaluation) && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.deleteEvaluation}
                    hitSlop={8}
                    onPress={() => requestDelete(evaluation.id)}
                    style={styles.deleteButton}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </Pressable>
                )}
              </View>
            </Card>
          ))}
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginTop: 10 },
  topRowNarrow: { flexWrap: 'wrap' },
  back: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.primary, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.text, fontWeight: '900', fontSize: 30, marginTop: 3 },
  titleNarrow: { fontSize: 27, lineHeight: 33 },
  event: { color: colors.textMuted, marginTop: 5 },
  offlineWrap: { alignItems: 'flex-end' },
  offlineWrapNarrow: { width: '100%', alignItems: 'flex-start', paddingLeft: 58, marginTop: -4 },
  newButton: { alignSelf: 'flex-start', marginTop: 22 },
  loading: { marginTop: 60 },
  empty: { alignItems: 'center', marginTop: 22, paddingVertical: 55 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 14 },
  emptyText: { color: colors.textMuted, marginTop: 7, textAlign: 'center' },
  list: { gap: 12, marginTop: 20, paddingBottom: 20 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  itemMain: { flexDirection: 'row', gap: 13, alignItems: 'center', flex: 1 },
  itemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  itemCopy: { flex: 1 },
  address: { color: colors.text, fontWeight: '800', fontSize: 16 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  progressLine: { height: 4, backgroundColor: colors.surfaceMuted, borderRadius: 2, marginTop: 10 },
  progressFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  itemStatus: { alignItems: 'flex-end', gap: 8 },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sync: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  syncText: { color: colors.textMuted, fontSize: 11 },
});
