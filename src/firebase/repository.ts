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
import { mediaIdFromUri } from '@/domain/imageUri';
import { resolveLocalImageUri, uriToBlob } from '@/services/imagePersistence';
import { getFirebaseServices } from './client';

async function blobFromImageUri(uri?: string) {
  const resolved = await resolveLocalImageUri(uri);
  if (!resolved) throw new Error('Photo is not available locally');
  return uriToBlob(resolved);
}

function durableRemoteUri(uri: string) {
  return uri.startsWith('http://') || uri.startsWith('https://') ? uri : '';
}

export async function pushEvaluation(evaluation: Evaluation): Promise<Evaluation> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured');

  const photos = await Promise.all(
    evaluation.photos.map(async (photo) => {
      if (photo.storagePath) {
        if (durableRemoteUri(photo.localUri)) return photo;
        const localUri = await getDownloadURL(ref(services.storage, photo.storagePath));
        return { ...photo, localUri, syncState: 'synced' as const };
      }
      const blob = await blobFromImageUri(photo.localUri);
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
      const localUri = await getDownloadURL(ref(services.storage, storagePath));
      return { ...photo, localUri, storagePath, syncState: 'synced' as const };
    }),
  );

  let sketchUri = evaluation.sketchUri;
  let sketchStoragePath = evaluation.sketchStoragePath;
  if (sketchUri && !sketchStoragePath) {
    const blob = await blobFromImageUri(sketchUri);
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
  } else if (sketchStoragePath && sketchUri && !durableRemoteUri(sketchUri)) {
    sketchUri = await getDownloadURL(ref(services.storage, sketchStoragePath));
  }

  const next = {
    ...evaluation,
    photos: photos.map((photo, index) => ({
      ...photo,
      localUri: mediaIdFromUri(evaluation.photos[index]?.localUri)
        ? evaluation.photos[index]!.localUri
        : photo.localUri,
    })),
    sketchUri: mediaIdFromUri(evaluation.sketchUri) ? evaluation.sketchUri : sketchUri,
    sketchStoragePath,
    syncState: 'synced' as const,
    syncedAt: new Date().toISOString(),
  };
  await setDoc(doc(services.db, 'evaluations', evaluation.id), {
    ...next,
    photos: photos.map((photo) => ({
      ...photo,
      localUri: durableRemoteUri(photo.localUri),
    })),
    sketchUri: sketchUri && durableRemoteUri(sketchUri) ? sketchUri : '',
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
