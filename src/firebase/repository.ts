import {
  collection,
  deleteDoc,
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

import { normalizeEvaluation, type Evaluation } from '@/domain/evaluation';
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

  let sketchUri = evaluation.sketchUri;
  let sketchStoragePath = evaluation.sketchStoragePath;
  if (
    sketchUri &&
    !sketchStoragePath &&
    !sketchUri.startsWith('data:') &&
    !sketchUri.startsWith('http://') &&
    !sketchUri.startsWith('https://')
  ) {
    const response = await fetch(sketchUri);
    const blob = await response.blob();
    sketchStoragePath = `evaluations/${evaluation.id}/sketch/sketch-${Date.now()}.jpg`;
    const sketchReference = ref(services.storage, sketchStoragePath);
    await uploadBytes(sketchReference, blob, {
      contentType: 'image/jpeg',
      customMetadata: {
        evaluationId: evaluation.id,
        jurisdictionId: evaluation.jurisdictionId,
        createdByUserId: evaluation.createdByUserId,
        sectionRef: 'sketch',
      },
    });
    sketchUri = await getDownloadURL(sketchReference);
  }

  const next = {
    ...evaluation,
    photos,
    sketchUri,
    sketchStoragePath,
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
  return snapshot.exists() ? normalizeEvaluation(snapshot.data() as Evaluation) : null;
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
  return snapshot.docs.map((item) => normalizeEvaluation(item.data() as Evaluation));
}

export async function deleteRemoteEvaluation(id: string) {
  const services = getFirebaseServices();
  if (!services) return;
  const reference = doc(services.db, 'evaluations', id);
  const snapshot = await getDoc(reference);
  if (snapshot.exists()) await deleteDoc(reference);
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
    (snapshot) =>
      onChange(snapshot.docs.map((item) => normalizeEvaluation(item.data() as Evaluation))),
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
    (snapshot) =>
      onChange(snapshot.docs.map((item) => normalizeEvaluation(item.data() as Evaluation))),
    (error) => onError?.(error),
  );
}

export async function resolveAttachmentUrl(storagePath: string) {
  const services = getFirebaseServices();
  if (!services) return null;
  return getDownloadURL(ref(services.storage, storagePath));
}
