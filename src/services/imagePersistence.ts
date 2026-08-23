import * as ImageManipulator from 'expo-image-manipulator';

import {
  dataUriFromBase64,
  isEphemeralImageUri,
  isInlineImageUri,
  mediaIdFromUri,
  mediaUriFor,
  persistableImageUri,
} from '@/domain/imageUri';
import { loadMedia, saveMedia } from '@/services/mediaStore';

export async function readUriAsDataUri(uri: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image'));
    reader.readAsDataURL(blob);
  });
}

export async function toPersistableDataUri(asset: {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
}) {
  const fallback = persistableImageUri(asset);
  if (fallback.startsWith('data:')) return fallback;
  try {
    const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
    context.resize({ width: 1600 });
    const rendered = await context.renderAsync();
    const compressed = await rendered.saveAsync({
      compress: 0.72,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    if (compressed.base64) return dataUriFromBase64(compressed.base64, 'image/jpeg');
    return await readUriAsDataUri(compressed.uri);
  } catch {
    if (fallback.startsWith('data:')) return fallback;
    return readUriAsDataUri(asset.uri);
  }
}

export async function persistImage(id: string, asset: {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
}) {
  const dataUri = await toPersistableDataUri(asset);
  try {
    await saveMedia(id, dataUri);
    return mediaUriFor(id);
  } catch {
    return dataUri;
  }
}

export async function resolveLocalImageUri(uri?: string) {
  if (uri && isInlineImageUri(uri) && !isEphemeralImageUri(uri)) return uri;
  const mediaId = mediaIdFromUri(uri);
  if (mediaId) {
    const stored = await loadMedia(mediaId);
    if (stored) return stored;
  }
  return undefined;
}

export async function uriToBlob(uri: string) {
  const response = await fetch(uri);
  return response.blob();
}
