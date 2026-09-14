import {
  DocumentReference,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  waitForPendingWrites,
  where,
  type Firestore,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { normalizeEvaluation, type Evaluation } from '@/domain/evaluation';
import { mediaIdFromUri } from '@/domain/imageUri';
import { resolveLocalImageUri, uriToBlob } from '@/services/imagePersistence';
import { firestoreEvaluationDocument } from './firestorePayload';
import { getFirebaseServices } from './client';

async function blobFromImageUri(uri?: string) {
  const resolved = await resolveLocalImageUri(uri);
  if (!resolved) throw new Error('Photo is not available locally');
  return uriToBlob(resolved);
}

function durableRemoteUri(uri: string) {
  return uri.startsWith('http://') || uri.startsWith('https://') ? uri : '';
}

function isPermissionDenied(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      String((error as { code: unknown }).code).includes('permission-denied'),
  );
}

/**
 * Work groups of the signed-in account, read from the cached ID token. The Firestore
 * rules only accept `groupIds` that are a subset of this claim, so authors stamp their
 * own evaluations while moderators editing someone else's draft leave the tag alone.
 */
async function claimedGroupIds(): Promise<string[]> {
  const current = getFirebaseServices()?.auth.currentUser;
  if (!current) return [];
  try {
    const token = await current.getIdTokenResult();
    return Array.isArray(token.claims.groupIds)
      ? token.claims.groupIds.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

async function readExistingEvaluation(reference: DocumentReference) {
  try {
    const snapshot = await getDoc(reference);
    return snapshot.exists() ? normalizeEvaluation(snapshot.data() as Evaluation) : null;
  } catch (error) {
    if (isPermissionDenied(error)) return null;
    throw error;
  }
}

async function confirmServerWrite(db: Firestore, reference: DocumentReference) {
  await Promise.race([
    waitForPendingWrites(db),
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Firebase no confirmó la escritura en el servidor (tiempo agotado).')),
        25_000,
      );
    }),
  ]);
  const snapshot = await getDocFromServer(reference);
  if (!snapshot.exists()) {
    throw new Error('Firebase no guardó la evaluación en el servidor.');
  }
  return normalizeEvaluation(snapshot.data() as Evaluation);
}

export async function pushEvaluation(evaluation: Evaluation): Promise<Evaluation> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured');

  const reference = doc(services.db, 'evaluations', evaluation.id);
  const existing = await readExistingEvaluation(reference);
  if (existing?.officialNumber != null || existing?.canonicalPdfStoragePath) {
    return {
      ...evaluation,
      ...existing,
      photos: evaluation.photos.length ? evaluation.photos : existing.photos,
      sketchUri: evaluation.sketchUri || existing.sketchUri,
      signatureUri: evaluation.signatureUri || existing.signatureUri,
    };
  }

  const photos = await Promise.all(
    evaluation.photos.map(async (photo) => {
      try {
        if (photo.storagePath) {
          if (durableRemoteUri(photo.localUri)) return photo;
          const localUri = await getDownloadURL(ref(services.storage, photo.storagePath));
          return { ...photo, localUri, syncState: 'synced' as const };
        }
        const blob = await blobFromImageUri(photo.localUri);
        const storagePath = `evaluations/${evaluation.id}/photos/${photo.id}-${Date.now()}.jpg`;
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
      } catch (error) {
        console.error(`EVALQUAKE photo upload failed for ${photo.id}`, error);
        return { ...photo, localUri: durableRemoteUri(photo.localUri), syncState: 'pending' as const };
      }
    }),
  );

  let sketchUri = evaluation.sketchUri;
  let sketchStoragePath = evaluation.sketchStoragePath;
  try {
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
  } catch (error) {
    console.error(`EVALQUAKE sketch upload failed for ${evaluation.id}`, error);
    sketchUri = durableRemoteUri(evaluation.sketchUri ?? '');
    sketchStoragePath = evaluation.sketchStoragePath;
  }

  let signatureUri = evaluation.signatureUri;
  try {
    if (signatureUri && !durableRemoteUri(signatureUri)) {
      const blob = await blobFromImageUri(signatureUri);
      const signaturePath = `evaluations/${evaluation.id}/signature/signature-${Date.now()}.jpg`;
      const signatureReference = ref(services.storage, signaturePath);
      await uploadBytes(signatureReference, blob, {
        contentType: 'image/jpeg',
        customMetadata: {
          evaluationId: evaluation.id,
          jurisdictionId: evaluation.jurisdictionId,
          createdByUserId: evaluation.createdByUserId,
          sectionRef: 'signature',
        },
      });
      signatureUri = await getDownloadURL(signatureReference);
    }
  } catch (error) {
    console.error(`EVALQUAKE signature upload failed for ${evaluation.id}`, error);
    signatureUri = durableRemoteUri(evaluation.signatureUri ?? '');
  }

  const authorUid = existing?.createdByUserId || evaluation.createdByUserId;
  const isAuthor = services.auth.currentUser?.uid === authorUid;
  const next = {
    ...evaluation,
    createdByUserId: authorUid,
    groupIds: isAuthor
      ? await claimedGroupIds()
      : existing?.groupIds ?? evaluation.groupIds ?? [],
    photos: photos.map((photo, index) => ({
      ...photo,
      localUri: mediaIdFromUri(evaluation.photos[index]?.localUri)
        ? evaluation.photos[index]!.localUri
        : photo.localUri,
    })),
    sketchUri: mediaIdFromUri(evaluation.sketchUri) ? evaluation.sketchUri : sketchUri,
    sketchStoragePath,
    signatureUri: mediaIdFromUri(evaluation.signatureUri) ? evaluation.signatureUri : signatureUri,
    syncState: 'synced' as const,
    syncedAt: new Date().toISOString(),
  };
  await setDoc(
    reference,
    firestoreEvaluationDocument({
      ...next,
      photos: photos.map((photo) => ({
        ...photo,
        localUri: durableRemoteUri(photo.localUri),
      })),
      sketchUri: sketchUri && durableRemoteUri(sketchUri) ? sketchUri : '',
      signatureUri: signatureUri && durableRemoteUri(signatureUri) ? signatureUri : '',
      localPdfUri: undefined,
      serverUpdatedAt: serverTimestamp(),
    } as Record<string, unknown>),
  );
  const server = await confirmServerWrite(services.db, reference);
  return {
    ...next,
    officialNumber: server.officialNumber ?? next.officialNumber,
    status: server.status,
    syncState: 'synced' as const,
    canonicalPdfStoragePath: server.canonicalPdfStoragePath,
    canonicalPdfState: server.canonicalPdfState,
  };
}

export async function pullEvaluation(id: string): Promise<Evaluation | null> {
  const services = getFirebaseServices();
  if (!services) return null;
  const snapshot = await getDoc(doc(services.db, 'evaluations', id));
  return snapshot.exists() ? normalizeEvaluation(snapshot.data() as Evaluation) : null;
}

export function subscribeEvaluation(
  id: string,
  onChange: (evaluation: Evaluation) => void,
  onError?: (error: Error) => void,
) {
  const services = getFirebaseServices();
  if (!services) return () => undefined;
  return onSnapshot(
    doc(services.db, 'evaluations', id),
    (snapshot) => {
      if (!snapshot.exists()) return;
      onChange(normalizeEvaluation(snapshot.data() as Evaluation));
    },
    (error) => onError?.(error),
  );
}

export async function listRemoteEvaluations(
  jurisdictionIds: string[],
  eventId: string,
  options?: { allEvent?: boolean },
): Promise<Evaluation[]> {
  const services = getFirebaseServices();
  const allEvent = options?.allEvent === true;
  if (!services || (!allEvent && jurisdictionIds.length === 0)) return [];
  const snapshot = await getDocs(
    query(
      collection(services.db, 'evaluations'),
      ...(allEvent
        ? [where('eventId', '==', eventId)]
        : [
            where('eventId', '==', eventId),
            where('jurisdictionId', 'in', jurisdictionIds.slice(0, 10)),
          ]),
      orderBy('updatedAt', 'desc'),
      limit(500),
    ),
  );
  return snapshot.docs.map((item) => normalizeEvaluation(item.data() as Evaluation));
}

export async function deleteRemoteEvaluation(id: string) {
  const services = getFirebaseServices();
  if (!services) return;
  try {
    await deleteDoc(doc(services.db, 'evaluations', id));
  } catch (error) {
    if (isPermissionDenied(error)) return;
    throw error;
  }
}

export function subscribeRemoteEvaluations(
  jurisdictionIds: string[],
  eventId: string,
  onChange: (evaluations: Evaluation[]) => void,
  onError?: (error: Error) => void,
  options?: { allEvent?: boolean },
) {
  const services = getFirebaseServices();
  const allEvent = options?.allEvent === true;
  if (!services || (!allEvent && jurisdictionIds.length === 0)) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    query(
      collection(services.db, 'evaluations'),
      ...(allEvent
        ? [where('eventId', '==', eventId)]
        : [
            where('eventId', '==', eventId),
            where('jurisdictionId', 'in', jurisdictionIds.slice(0, 10)),
          ]),
      orderBy('updatedAt', 'desc'),
      limit(500),
    ),
    (snapshot) =>
      onChange(snapshot.docs.map((item) => normalizeEvaluation(item.data() as Evaluation))),
    (error) => onError?.(error),
  );
}

/**
 * Evaluations tagged with any of the caller's work groups. Used by the read-only
 * dashboard for the evaluator role, whose Firestore rules only clear documents whose
 * `groupIds` intersect the `groupIds` custom claim.
 */
export function subscribeGroupEvaluations(
  groupIds: string[],
  eventId: string,
  onChange: (evaluations: Evaluation[]) => void,
  onError?: (error: Error) => void,
) {
  const services = getFirebaseServices();
  const scoped = groupIds.filter(Boolean).slice(0, 10);
  if (!services || scoped.length === 0) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    query(
      collection(services.db, 'evaluations'),
      where('eventId', '==', eventId),
      where('groupIds', 'array-contains-any', scoped),
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
  _jurisdictionIds: string[],
  onChange: (evaluations: Evaluation[]) => void,
  onError?: (error: Error) => void,
  _options?: { allMine?: boolean },
) {
  const services = getFirebaseServices();
  if (!services) {
    onChange([]);
    return () => undefined;
  }
  const evaluations = collection(services.db, 'evaluations');
  let owned: Evaluation[] = [];
  let shared: Evaluation[] = [];
  const emit = () => {
    const merged = new Map<string, Evaluation>();
    for (const record of [...owned, ...shared]) merged.set(record.id, record);
    onChange(
      [...merged.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    );
  };
  const unsubOwned = onSnapshot(
    query(evaluations, where('createdByUserId', '==', userId), orderBy('updatedAt', 'desc'), limit(500)),
    (snapshot) => {
      owned = snapshot.docs.map((item) => normalizeEvaluation(item.data() as Evaluation));
      emit();
    },
    (error) => onError?.(error),
  );
  const unsubShared = onSnapshot(
    query(
      evaluations,
      where('sharedWithUserIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc'),
      limit(500),
    ),
    (snapshot) => {
      shared = snapshot.docs.map((item) => normalizeEvaluation(item.data() as Evaluation));
      emit();
    },
    (error) => onError?.(error),
  );
  return () => {
    unsubOwned();
    unsubShared();
  };
}

export async function resolveAttachmentUrl(storagePath: string) {
  const services = getFirebaseServices();
  if (!services) return null;
  return getDownloadURL(ref(services.storage, storagePath));
}
