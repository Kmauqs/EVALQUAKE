import type { Evaluation } from '@/domain/evaluation';
import { isEphemeralImageUri } from '@/domain/imageUri';
import { resolveAttachmentUrl } from '@/firebase/repository';
import { resolveLocalImageUri } from '@/services/imagePersistence';

export async function resolveImageUri(uri?: string, storagePath?: string) {
  const local = await resolveLocalImageUri(uri);
  if (local && !isEphemeralImageUri(local)) return local;
  if (storagePath) {
    try {
      return (await resolveAttachmentUrl(storagePath)) ?? undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function hydrateEvaluationImages(evaluation: Evaluation): Promise<Evaluation> {
  const photos = await Promise.all(
    evaluation.photos.map(async (photo) => ({
      ...photo,
      localUri: (await resolveImageUri(photo.localUri, photo.storagePath)) ?? photo.localUri,
    })),
  );
  const sketchUri = evaluation.sketchUri
    ? ((await resolveImageUri(evaluation.sketchUri, evaluation.sketchStoragePath)) ?? evaluation.sketchUri)
    : evaluation.sketchUri;
  return { ...evaluation, photos, sketchUri };
}
