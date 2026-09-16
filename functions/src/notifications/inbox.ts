import { getFirestore } from 'firebase-admin/firestore';

import { jobDocumentId } from './ids';
import type { DispatchNotificationInput } from './types';

const db = getFirestore();

/** Write one in-app inbox document per recipient (idempotent by dedupeKey + uid). */
export async function writeInboxNotifications(
  input: DispatchNotificationInput,
  recipientUids: string[],
): Promise<number> {
  const now = new Date().toISOString();
  let written = 0;
  await Promise.all(
    recipientUids.map(async (uid) => {
      const reference = db.doc(
        `users/${uid}/notifications/${jobDocumentId(`${input.dedupeKey}:${uid}`)}`,
      );
      const existing = await reference.get();
      if (existing.exists) return;
      await reference.set({
        id: reference.id,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        readAt: null,
        createdAt: now,
        dedupeKey: input.dedupeKey,
        meta: input.meta ?? {},
      });
      written += 1;
    }),
  );
  return written;
}
