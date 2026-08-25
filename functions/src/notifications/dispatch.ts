import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

import { enqueueMail } from './email';
import { writeInboxNotifications } from './inbox';
import { jobDocumentId } from './ids';
import { resolveRecipientEmails } from './recipients';
import type { DispatchNotificationInput, DispatchNotificationResult } from './types';

if (!getApps().length) initializeApp();

const db = getFirestore();

/**
 * Notification dispatcher: idempotent email (`mail/`) + in-app inbox
 * (`users/{uid}/notifications`). Push arrives in a later phase.
 */
export async function dispatchNotification(
  input: DispatchNotificationInput,
): Promise<DispatchNotificationResult> {
  const recipientUids = [...new Set(input.recipientUids.filter(Boolean))];
  const jobId = jobDocumentId(input.dedupeKey);
  const jobRef = db.doc(`notificationJobs/${jobId}`);

  const claimed = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(jobRef);
    if (existing.exists) {
      const status = existing.data()?.status;
      if (status === 'completed' || status === 'processing') return false;
    }
    transaction.set(jobRef, {
      dedupeKey: input.dedupeKey,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      meta: input.meta ?? {},
      status: 'processing',
      recipientUids,
      channels: ['email', 'in_app'],
      createdAt: new Date().toISOString(),
      serverUpdatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });

  if (!claimed) {
    logger.info('Notification skipped (dedupe)', { dedupeKey: input.dedupeKey, type: input.type });
    return { skipped: true, recipientCount: 0, mailCount: 0, inboxCount: 0 };
  }

  try {
    const inboxCount = await writeInboxNotifications(input, recipientUids);
    const emails = await resolveRecipientEmails(recipientUids);
    let mailCount = 0;
    for (const [uid, to] of emails) {
      await enqueueMail({
        to,
        email: input.email,
        dedupeKey: input.dedupeKey,
        type: input.type,
        recipientUid: uid,
      });
      mailCount += 1;
    }

    const missing = recipientUids.filter((uid) => !emails.has(uid));
    if (missing.length) {
      logger.warn('Notification recipients without email', {
        dedupeKey: input.dedupeKey,
        missing,
      });
    }

    await jobRef.set(
      {
        status: 'completed',
        recipientCount: recipientUids.length,
        mailCount,
        inboxCount,
        completedAt: new Date().toISOString(),
        serverUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    logger.info('Notification dispatched', {
      type: input.type,
      dedupeKey: input.dedupeKey,
      recipientCount: recipientUids.length,
      mailCount,
      inboxCount,
    });

    return { skipped: false, recipientCount: recipientUids.length, mailCount, inboxCount };
  } catch (error) {
    await jobRef.set(
      {
        status: 'error',
        error: String(error),
        serverUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    throw error;
  }
}
