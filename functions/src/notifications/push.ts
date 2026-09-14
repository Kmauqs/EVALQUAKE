import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, type DocumentData } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

import { isExpoPushToken } from './expoToken';

if (!getApps().length) initializeApp();

const db = getFirestore();
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

export interface DeviceTokenRecord {
  id: string;
  uid: string;
  token: string;
}

function isUsableDevice(data: DocumentData | undefined) {
  if (!data) return false;
  if (data.disabled === true) return false;
  return isExpoPushToken(data.token);
}

/** Collect active Expo push tokens for the given users. */
export async function listPushTokens(uids: string[]): Promise<DeviceTokenRecord[]> {
  const unique = [...new Set(uids.filter(Boolean))];
  const devices: DeviceTokenRecord[] = [];
  await Promise.all(
    unique.map(async (uid) => {
      const snapshot = await db.collection(`users/${uid}/devices`).get();
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!isUsableDevice(data)) continue;
        devices.push({ id: doc.id, uid, token: String(data.token).trim() });
      }
    }),
  );
  return devices;
}

async function disableDevice(uid: string, deviceId: string, reason: string) {
  await db.doc(`users/${uid}/devices/${deviceId}`).set(
    {
      disabled: true,
      disabledReason: reason,
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Send system-tray notifications via Expo Push (works with Expo Go / EAS builds).
 * Invalid tokens are disabled in Firestore.
 */
export async function sendExpoPush(input: {
  devices: DeviceTokenRecord[];
  title: string;
  body: string;
  href?: string;
  type: string;
  dedupeKey: string;
}): Promise<number> {
  if (!input.devices.length) return 0;

  let sent = 0;
  for (let index = 0; index < input.devices.length; index += CHUNK_SIZE) {
    const chunk = input.devices.slice(index, index + CHUNK_SIZE);
    const messages = chunk.map((device) => ({
      to: device.token,
      title: input.title,
      body: input.body,
      sound: 'default' as const,
      data: {
        href: input.href ?? '',
        type: input.type,
        dedupeKey: input.dedupeKey,
      },
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error('Expo push HTTP error', { status: response.status, text });
      throw new Error(`Expo push failed: HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: Array<{ status?: string; message?: string; details?: { error?: string } }>;
    };
    const tickets = payload.data ?? [];
    for (let i = 0; i < tickets.length; i += 1) {
      const ticket = tickets[i];
      const device = chunk[i];
      if (!ticket || !device) continue;
      if (ticket.status === 'ok') {
        sent += 1;
        continue;
      }
      const errorCode = ticket.details?.error ?? ticket.message ?? 'unknown';
      logger.warn('Expo push ticket error', {
        uid: device.uid,
        deviceId: device.id,
        errorCode,
      });
      if (errorCode === 'DeviceNotRegistered' || String(errorCode).includes('not a registered')) {
        await disableDevice(device.uid, device.id, String(errorCode));
      }
    }
  }

  return sent;
}
