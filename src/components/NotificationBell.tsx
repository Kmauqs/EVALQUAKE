import { type Href, useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { isUnread } from '@/domain/notification';
import type { AppNotification } from '@/domain/notification';
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from '@/firebase/notifications';
import { useI18n } from '@/i18n/I18nProvider';
import { colors, shadows } from '@/theme';

function formatWhen(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(locale === 'en' ? 'en-US' : 'es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function NotificationBell() {
  const { t, language } = useI18n();
  const { uid, configured, user } = useAuth();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!configured || !user || !uid) {
      setItems([]);
      return;
    }
    return subscribeNotifications(uid, setItems);
  }, [configured, uid, user]);

  const unreadCount = useMemo(() => items.filter(isUnread).length, [items]);

  if (!configured || !user) return null;

  const openItem = async (item: AppNotification) => {
    if (isUnread(item)) {
      try {
        await markNotificationRead(uid, item.id);
      } catch {
        /* keep navigation even if mark fails */
      }
    }
    setOpen(false);
    if (item.href) router.push(item.href as Href);
  };

  const markAll = async () => {
    if (!unreadCount || busy) return;
    setBusy(true);
    try {
      await markAllNotificationsRead(uid, items);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.notifications}
        onPress={() => setOpen(true)}
        style={styles.trigger}
      >
        <Bell size={17} color={colors.primary} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { maxHeight: height * 0.78 }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t.notifications}</Text>
              {unreadCount > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => void markAll()}
                  style={styles.markAll}
                >
                  <Text style={styles.markAllText}>{t.markAllNotificationsRead}</Text>
                </Pressable>
              ) : null}
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              contentContainerStyle={styles.listContent}
            >
              {items.length === 0 ? (
                <Text style={styles.empty}>{t.notificationsEmpty}</Text>
              ) : (
                items.map((item) => {
                  const unread = isUnread(item);
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      onPress={() => void openItem(item)}
                      style={[styles.item, unread && styles.itemUnread]}
                    >
                      <View style={styles.itemTop}>
                        <Text style={styles.itemTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        {unread ? <View style={styles.unreadDot} /> : null}
                      </View>
                      <Text style={styles.itemBody} numberOfLines={3}>
                        {item.body}
                      </Text>
                      <Text style={styles.itemWhen}>{formatWhen(item.createdAt, language)}</Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <Pressable onPress={() => setOpen(false)} style={styles.close}>
              <Text style={styles.closeText}>{t.close}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    position: 'relative',
    minHeight: 36,
    minWidth: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 20, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    ...shadows,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  markAll: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  markAllText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    gap: 8,
    paddingBottom: 4,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  item: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    backgroundColor: colors.white,
  },
  itemUnread: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.mint,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  itemBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  itemWhen: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  close: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  closeText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
