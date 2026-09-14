import { UserPlus, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import type { Evaluation } from '@/domain/evaluation';
import type { AppUser } from '@/domain/user';
import { subscribeEvaluators } from '@/firebase/users';
import { useI18n } from '@/i18n/I18nProvider';
import { colors } from '@/theme';

export function ShareSupportModal({
  evaluation,
  currentUserId,
  visible,
  onClose,
  onShare,
}: {
  evaluation: Evaluation | null;
  currentUserId: string;
  visible: boolean;
  onClose: () => void;
  onShare: (userId: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [evaluators, setEvaluators] = useState<AppUser[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    return subscribeEvaluators(setEvaluators);
  }, [visible]);

  if (!visible || !evaluation) return null;

  const candidates = evaluators.filter(
    (item) => item.id !== currentUserId && !evaluation.sharedWithUserIds.includes(item.id),
  );
  const sharedLabels = evaluation.sharedWithUserIds.map(
    (userId) => evaluators.find((item) => item.id === userId)?.email || userId,
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <Text style={styles.title}>{t.shareWithEvaluator}</Text>
              <Text style={styles.subtitle}>{t.shareWithEvaluatorHint}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.close} hitSlop={8}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          {sharedLabels.length ? (
            <Text style={styles.shared}>
              {t.supportingInspectors}: {sharedLabels.join(', ')}
            </Text>
          ) : null}
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {candidates.length === 0 ? (
              <Text style={styles.empty}>{t.noEvaluatorsToShare}</Text>
            ) : (
              candidates.map((item) => (
                <Card key={item.id} style={styles.row}>
                  <View style={styles.rowCopy}>
                    <Text style={styles.email}>{item.email || item.id}</Text>
                    <Text style={styles.meta}>{t.supportingInspector}</Text>
                  </View>
                  <Button
                    variant="ghost"
                    loading={busyId === item.id}
                    icon={<UserPlus size={16} color={colors.primary} />}
                    onPress={() => {
                      setBusyId(item.id);
                      void onShare(item.id)
                        .then(onClose)
                        .finally(() => setBusyId(null));
                    }}
                  >
                    {t.share}
                  </Button>
                </Card>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 31, 28, 0.45)',
    justifyContent: 'center',
    padding: 22,
  },
  sheet: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: 18,
    maxHeight: '80%',
    gap: 10,
  },
  list: { maxHeight: 360 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heading: { flex: 1 },
  title: { color: colors.text, fontWeight: '900', fontSize: 18 },
  subtitle: { color: colors.textMuted, marginTop: 4, fontSize: 13, lineHeight: 18 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shared: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  empty: { color: colors.textMuted, paddingVertical: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  rowCopy: { flex: 1, minWidth: 0 },
  email: { color: colors.text, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
});
