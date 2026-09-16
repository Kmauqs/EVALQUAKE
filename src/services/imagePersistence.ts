import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { PHOTO_JPEG_QUALITY, PHOTO_MAX_EDGE, targetPhotoSize } from '@/domain/imageCompression';
import {
  dataUriFromBase64,
  isEphemeralImageUri,
  isInlineImageUri,
  mediaIdFromUri,
  mediaUriFor,
  persistableImageUri,
} from '@/domain/imageUri';
import { loadMedia, saveMedia } from '@/services/mediaStore';

export { PHOTO_JPEG_QUALITY, PHOTO_MAX_EDGE, targetPhotoSize } from '@/domain/imageCompression';

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

async function compressWithManipulator(uri: string) {
  const probe = await ImageManipulator.ImageManipulator.manipulate(uri).renderAsync();
  const size = targetPhotoSize(probe.width, probe.height);
  const needsResize = size.width !== probe.width || size.height !== probe.height;

  let image = probe;
  if (needsResize) {
    const context = ImageManipulator.ImageManipulator.manipulate(uri);
    context.resize({ width: size.width, height: size.height });
    image = await context.renderAsync();
  }

  const compressed = await image.saveAsync({
    compress: PHOTO_JPEG_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (compressed.base64) return dataUriFromBase64(compressed.base64, 'image/jpeg');
  return readUriAsDataUri(compressed.uri);
}

function loadHtmlImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode image for compression'));
    image.src = src;
  });
}

/** Web fallback when expo-image-manipulator cannot process the picker asset. */
export async function compressWithCanvas(sourceUri: string, maxEdge = PHOTO_MAX_EDGE, quality = PHOTO_JPEG_QUALITY) {
  if (typeof document === 'undefined') {
    throw new Error('Canvas compression is only available on web');
  }
  const image = await loadHtmlImage(sourceUri);
  const size = targetPhotoSize(image.naturalWidth || image.width, image.naturalHeight || image.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create canvas for compression');
  context.drawImage(image, 0, 0, size.width, size.height);
  const dataUri = canvas.toDataURL('image/jpeg', quality);
  if (!dataUri.startsWith('data:image/jpeg')) throw new Error('Canvas did not produce JPEG');
  return dataUri;
}

async function sourceUriForCompression(asset: {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
}) {
  if (asset.uri.startsWith('data:') || asset.uri.startsWith('blob:') || asset.uri.startsWith('http')) {
    return asset.uri;
  }
  if (asset.base64) return dataUriFromBase64(asset.base64, asset.mimeType || 'image/jpeg');
  return asset.uri;
}

/**
 * Always re-encodes field photos as resized JPEGs so Storage uploads and printed
 * report PDFs stay lean. Never returns the raw camera/gallery payload on purpose.
 */
export async function toPersistableDataUri(asset: {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
}) {
  const sourceUri = await sourceUriForCompression(asset);
  const errors: string[] = [];

  try {
    return await compressWithManipulator(sourceUri);
  } catch (error) {
    errors.push(String(error instanceof Error ? error.message : error));
  }

  if (Platform.OS === 'web') {
    try {
      return await compressWithCanvas(sourceUri);
    } catch (error) {
      errors.push(String(error instanceof Error ? error.message : error));
    }
  }

  const fallback = persistableImageUri(asset);
  if (fallback.startsWith('data:')) {
    if (Platform.OS === 'web') {
      try {
        return await compressWithCanvas(fallback);
      } catch (error) {
        errors.push(String(error instanceof Error ? error.message : error));
      }
    }
    return fallback;
  }

  try {
    const raw = await readUriAsDataUri(asset.uri);
    if (Platform.OS === 'web') {
      try {
        return await compressWithCanvas(raw);
      } catch (error) {
        errors.push(String(error instanceof Error ? error.message : error));
      }
    }
    return raw;
  } catch (error) {
    errors.push(String(error instanceof Error ? error.message : error));
    throw new Error(`Could not compress photo (${errors.filter(Boolean).join('; ') || 'unknown'})`);
  }
}

export async function persistImage(
  id: string,
  asset: {
    uri: string;
    base64?: string | null;
    mimeType?: string | null;
  },
) {
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
