import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import type { NotificationEmail } from './types';

if (!getApps().length) initializeApp();

const db = getFirestore();

/**
 * Enqueue a message for the Firebase "Trigger Email" extension
 * (`firebase/firestore-send-email`) or any worker that reads `mail/{id}`.
 */
export async function enqueueMail(input: {
  to: string;
  email: NotificationEmail;
  dedupeKey: string;
  type: string;
  recipientUid: string;
}) {
  const reference = db.collection('mail').doc();
  await reference.set({
    to: [input.to],
    message: {
      subject: input.email.subject,
      html: input.email.html,
      text: input.email.text,
    },
    type: input.type,
    dedupeKey: input.dedupeKey,
    recipientUid: input.recipientUid,
    createdAt: new Date().toISOString(),
    serverCreatedAt: FieldValue.serverTimestamp(),
  });
  return reference.id;
}

