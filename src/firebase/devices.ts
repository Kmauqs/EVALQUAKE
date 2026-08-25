import { digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
import { doc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { getFirebaseServices } from './client';

export type DevicePlatform = 'ios' | 'android';

export async function deviceDocumentId(token: string) {
  const digest = await digestStringAsync(CryptoDigestAlgorithm.SHA256, token);
  return digest.slice(0, 40);
}

export async function upsertDeviceToken(
  userId: string,
  token: string,
  platform: DevicePlatform,
) {
  const services = getFirebaseServices();
  if (!services || !userId || !token) return;
  const id = await deviceDocumentId(token);
  await setDoc(
    doc(services.db, 'users', userId, 'devices', id),
    {
      id,
      token,
      platform,
      provider: 'expo',
      disabled: false,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
  return id;
}

export async function disableDeviceToken(userId: string, token: string) {
  const services = getFirebaseServices();
  if (!services || !userId || !token) return;
  const id = await deviceDocumentId(token);
  await setDoc(
    doc(services.db, 'users', userId, 'devices', id),
    {
      disabled: true,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export function nativePushPlatform(): DevicePlatform | null {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS;
  return null;
}
