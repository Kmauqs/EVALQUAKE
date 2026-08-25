import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import type { AppNotification } from '@/domain/notification';
import { parseAppNotification } from '@/domain/notification';
import { getFirebaseServices } from './client';

const INBOX_LIMIT = 50;

export function subscribeNotifications(
  userId: string,
  onChange: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void,
) {
  const services = getFirebaseServices();
  if (!services || !userId) {
    onChange([]);
    return () => undefined;
  }
  const inbox = query(
    collection(services.db, 'users', userId, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(INBOX_LIMIT),
  );
  return onSnapshot(
    inbox,
    (snapshot) => {
      const items = snapshot.docs
        .map((item) => parseAppNotification(item.id, item.data()))
        .filter((item): item is AppNotification => item != null);
      onChange(items);
    },
    (error) => onError?.(error),
  );
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const services = getFirebaseServices();
  if (!services) return;
  const reference = doc(services.db, 'users', userId, 'notifications', notificationId);
  await updateDoc(reference, { readAt: new Date().toISOString() });
}

export async function markAllNotificationsRead(userId: string, notifications: AppNotification[]) {
  const services = getFirebaseServices();
  if (!services) return;
  const unread = notifications.filter((item) => item.readAt == null);
  if (!unread.length) return;
  const batch = writeBatch(services.db);
  const readAt = new Date().toISOString();
  for (const item of unread) {
    batch.update(doc(services.db, 'users', userId, 'notifications', item.id), { readAt });
  }
  await batch.commit();
}
