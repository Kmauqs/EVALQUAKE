import { useRouter } from 'expo-router';
import { ArrowLeft, Building2, Plus, RotateCw, Trash2, UserPlus } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ShareSupportModal } from '@/components/ShareSupportModal';
import { AppShell, Button, Card, ClassificationBadge, OfflinePill } from '@/components/ui';
import { useAuth } from '@/auth/AuthProvider';
import {
  canDeleteEvaluation,
  isEvaluationOwner,
  isSupportingInspector,
  needsRemoteSync,
  sectionCountFor,
  type Evaluation,
} from '@/domain/evaluation';
import { isSyncFailure } from '@/firebase/sync';
import { useI18n } from '@/i18n/I18nProvider';
import { useSafeBack } from '@/navigation/useSafeBack';
import { confirmDestructive } from '@/services/confirm';
import { notify } from '@/services/notify';
import { useEvaluations } from '@/state/EvaluationProvider';
import { colors } from '@/theme';

export default function EvaluatorHome() {
  const { t, language } = useI18n();
  const { evaluations: storedEvaluations, loading, create, remove, retrySync, lastSyncResult, share } = useEvaluations();
  const { uid } = useAuth();
  const evaluations = storedEvaluations.filter(
    (evaluation) => isEvaluationOwner(evaluation, uid) || isSupportingInspector(evaluation, uid),
  );
  const router = useRouter();
  const goBack = useSafeBack('/');
  const { width } = useWindowDimensions();
  const narrow = width < 600;

  const createNew = async () => {
    const evaluation = await create();
    router.push(`/(evaluator)/evaluation/${evaluation.id}`);
  };

  const [syncing, setSyncing] = useState(false);
  const [sharing, setSharing] = useState<Evaluation | null>(null);
  const pendingUpload = evaluations.some(
    (evaluation) =>
      needsRemoteSync(evaluation) || (evaluation.status !== 'draft' && evaluation.officialNumber == null),
  );
  const syncDetail = lastSyncResult?.errors.filter(Boolean).join('\n') ?? '';
  const syncFailed = Boolean(lastSyncResult && isSyncFailure(lastSyncResult));

  const requestRetry = () => {
    setSyncing(true);
    void retrySync()
      .then((result) => {
        const detail = result.errors.filter(Boolean).slice(0, 6).join('\n');
        notify(t.retrySync, isSyncFailure(result) ? detail || t.syncRetryFailed : t.syncRetryOk);
      })
      .catch((error) => notify(t.retrySync, String(error?.message ?? t.syncRetryFailed)))
      .finally(() => setSyncing(false));
  };

  const requestDelete = (id: string) => {
    confirmDestructive(
      t.deleteEvaluationTitle,
      t.deleteEvaluationConfirm,
      t.deleteEvaluation,
      t.cancel,
      () => {
        void remove(id).catch(() => notify(t.deleteEvaluationTitle, t.deleteFailed));
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
      {pendingUpload || syncFailed ? (
        <Button variant="ghost" loading={syncing} onPress={requestRetry} style={styles.retryButton}>
          {t.retrySync}
        </Button>
      ) : null}
      {syncFailed ? (
        <Card style={styles.syncError}>
          <Text style={styles.syncErrorTitle}>{t.retrySync}</Text>
          <Text style={styles.syncErrorText}>{syncDetail || t.syncRetryFailed}</Text>
        </Card>
      ) : null}

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
            <Card key={evaluation.id} style={[styles.item, narrow && styles.itemNarrow]}>
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
                    {isSupportingInspector(evaluation, uid) ? `${t.sharedWithYou} · ` : ''}
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
              <View style={[styles.itemStatus, narrow && styles.itemStatusNarrow]}>
                <ClassificationBadge value={evaluation.habitability} compact />
                <Pressable onPress={() => { if (!syncing) requestRetry(); }} style={styles.sync}>
                  <RotateCw size={12} color={colors.textMuted} />
                  <Text style={styles.syncText}>
                    {evaluation.syncState === 'synced' && evaluation.officialNumber != null
                      ? t.synced
                      : evaluation.syncState === 'synced'
                        ? t.officialPending
                        : t.pendingSync}
                  </Text>
                </Pressable>
                {isEvaluationOwner(evaluation, uid) && evaluation.status === 'draft' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.shareWithEvaluator}
                    hitSlop={8}
                    onPress={() => setSharing(evaluation)}
                    style={styles.deleteButton}
                  >
                    <UserPlus size={16} color={colors.primary} />
                  </Pressable>
                ) : null}
                {canDeleteEvaluation(evaluation, uid) && (
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
      <ShareSupportModal
        evaluation={sharing}
        currentUserId={uid}
        visible={Boolean(sharing)}
        onClose={() => setSharing(null)}
        onShare={(userId) => share(sharing!.id, userId)}
      />
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
  retryButton: { alignSelf: 'flex-start', marginTop: 10 },
  syncError: { marginTop: 12, borderColor: colors.danger, backgroundColor: colors.surfaceMuted },
  syncErrorTitle: { color: colors.danger, fontWeight: '800', fontSize: 13 },
  syncErrorText: { color: colors.text, marginTop: 6, fontSize: 13, lineHeight: 18 },
  loading: { marginTop: 60 },
  empty: { alignItems: 'center', marginTop: 22, paddingVertical: 55 },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 14 },
  emptyText: { color: colors.textMuted, marginTop: 7, textAlign: 'center' },
  list: { gap: 12, marginTop: 20, paddingBottom: 20 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  itemNarrow: { flexDirection: 'column', alignItems: 'stretch' },
  itemMain: { flexDirection: 'row', gap: 13, alignItems: 'center', flex: 1, minWidth: 0 },
  itemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemCopy: { flex: 1, minWidth: 0 },
  address: { color: colors.text, fontWeight: '800', fontSize: 16 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  progressLine: { height: 4, backgroundColor: colors.surfaceMuted, borderRadius: 2, marginTop: 10 },
  progressFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  itemStatus: { alignItems: 'flex-end', gap: 8, flexShrink: 0 },
  itemStatusNarrow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 57,
  },
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
