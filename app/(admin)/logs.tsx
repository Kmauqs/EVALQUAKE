import { type Href, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppShell, Card } from '@/components/ui';
import { subscribeActionLogs, type ActionLog } from '@/firebase/moderation';
import { useI18n } from '@/i18n/I18nProvider';
import { useSafeBack } from '@/navigation/useSafeBack';
import { colors } from '@/theme';

export default function AdminActionLogScreen() {
  const { t, language } = useI18n();
  const goBack = useSafeBack('/');
  const router = useRouter();
  const { width } = useWindowDimensions();
  const narrow = width < 700;
  const [logs, setLogs] = useState<ActionLog[]>([]);

  useEffect(() => subscribeActionLogs(setLogs), []);

  return (
    <AppShell>
      <View style={[styles.titleRow, narrow && styles.titleRowNarrow]}>
        <Pressable onPress={goBack} style={styles.back}>
          <ArrowLeft size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{t.admin}</Text>
          <Text style={[styles.title, narrow && styles.titleNarrow]}>{t.actionLog}</Text>
          <Text style={styles.subtitle}>{t.actionLogDescription}</Text>
        </View>
      </View>

      <View style={styles.list}>
        {logs.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(`/(coordinator)/evaluation/${item.evaluationId}` as Href)}
          >
            <Card style={styles.row}>
              <Text style={styles.action}>{t.actionLogDelete}</Text>
              <Text style={styles.meta}>
                {item.actorEmail || item.actorUid} · {item.actorRole === 'admin' ? t.admin : t.coordinator}
              </Text>
              <Text style={styles.detail}>
                {item.address || item.evaluationId} · {item.ownerEmail || item.ownerUid}
              </Text>
              <Text style={styles.detail}>
                {item.evaluationStatus}
                {item.officialNumber != null ? ` · #${item.officialNumber}` : ''} · {item.purpose}
              </Text>
              <Text style={styles.date}>{new Date(item.at).toLocaleString(language)}</Text>
            </Card>
          </Pressable>
        ))}
        {!logs.length && (
          <Card style={styles.empty}>
            <Text style={styles.emptyText}>{t.actionLogEmpty}</Text>
          </Card>
        )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, marginTop: 8 },
  titleRowNarrow: { flexWrap: 'wrap' },
  back: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.primary, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 3 },
  titleNarrow: { fontSize: 27, lineHeight: 33 },
  subtitle: { color: colors.textMuted, marginTop: 4 },
  list: { gap: 12, marginTop: 22, paddingBottom: 28 },
  row: { gap: 6 },
  action: { color: colors.text, fontWeight: '800', fontSize: 16 },
  meta: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  detail: { color: colors.textMuted, fontSize: 13 },
  date: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 36 },
  emptyText: { color: colors.textMuted },
});
