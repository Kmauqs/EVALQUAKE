import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import type { Evaluation } from '@/domain/evaluation';
import { getFirebaseServices } from './client';

export async function pushEvaluation(evaluation: Evaluation): Promise<Evaluation> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured');

  const photos = await Promise.all(
    evaluation.photos.map(async (photo) => {
      if (photo.storagePath) return photo;
      const response = await fetch(photo.localUri);
      const blob = await response.blob();
      const storagePath = `evaluations/${evaluation.id}/photos/${photo.id}.jpg`;
      await uploadBytes(ref(services.storage, storagePath), blob, {
        contentType: 'image/jpeg',
        customMetadata: {
          evaluationId: evaluation.id,
          jurisdictionId: evaluation.jurisdictionId,
          createdByUserId: evaluation.createdByUserId,
          sectionRef: photo.sectionRef,
        },
      });
      return { ...photo, storagePath, syncState: 'synced' as const };
    }),
  );

  const next = {
    ...evaluation,
    photos,
    syncState: 'synced' as const,
    syncedAt: new Date().toISOString(),
  };
  await setDoc(doc(services.db, 'evaluations', evaluation.id), {
    ...next,
    serverUpdatedAt: serverTimestamp(),
  });
  return next;
}

export async function pullEvaluation(id: string): Promise<Evaluation | null> {
  const services = getFirebaseServices();
  if (!services) return null;
  const snapshot = await getDoc(doc(services.db, 'evaluations', id));
  return snapshot.exists() ? (snapshot.data() as Evaluation) : null;
}

export async function listRemoteEvaluations(
  jurisdictionIds: string[],
  eventId: string,
): Promise<Evaluation[]> {
  const services = getFirebaseServices();
  if (!services || jurisdictionIds.length === 0) return [];
  const snapshot = await getDocs(
    query(
      collection(services.db, 'evaluations'),
      where('eventId', '==', eventId),
      where('jurisdictionId', 'in', jurisdictionIds.slice(0, 10)),
      orderBy('updatedAt', 'desc'),
      limit(500),
    ),
  );
  return snapshot.docs.map((item) => item.data() as Evaluation);
}

export function subscribeRemoteEvaluations(
  jurisdictionIds: string[],
  eventId: string,
  onChange: (evaluations: Evaluation[]) => void,
  onError?: (error: Error) => void,
) {
  const services = getFirebaseServices();
  if (!services || jurisdictionIds.length === 0) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    query(
      collection(services.db, 'evaluations'),
      where('eventId', '==', eventId),
      where('jurisdictionId', 'in', jurisdictionIds.slice(0, 10)),
      orderBy('updatedAt', 'desc'),
      limit(500),
    ),
    (snapshot) => onChange(snapshot.docs.map((item) => item.data() as Evaluation)),
    (error) => onError?.(error),
  );
}

export function subscribeUserEvaluations(
  userId: string,
  jurisdictionIds: string[],
  onChange: (evaluations: Evaluation[]) => void,
  onError?: (error: Error) => void,
) {
  const services = getFirebaseServices();
  if (!services || jurisdictionIds.length === 0) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    query(
      collection(services.db, 'evaluations'),
      where('createdByUserId', '==', userId),
      where('jurisdictionId', 'in', jurisdictionIds.slice(0, 10)),
      orderBy('updatedAt', 'desc'),
      limit(500),
    ),
    (snapshot) => onChange(snapshot.docs.map((item) => item.data() as Evaluation)),
    (error) => onError?.(error),
  );
}

export async function resolveAttachmentUrl(storagePath: string) {
  const services = getFirebaseServices();
  if (!services) return null;
  return getDownloadURL(ref(services.storage, storagePath));
}
