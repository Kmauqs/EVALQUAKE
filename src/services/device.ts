import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { Attachment, Coordinates } from '@/domain/evaluation';
import { cryptoRandomId } from '@/domain/evaluation';
import { hasPickerAssets, persistableImageUri } from '@/domain/imageUri';

export async function captureCoordinates(): Promise<Coordinates> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error('Location permission denied');
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy ?? undefined,
  };
}

export async function pickDamagePhoto(
  source: 'camera' | 'library',
  coordinates?: Coordinates,
): Promise<Attachment | null> {
  const photos = await pickDamagePhotos(source, coordinates, false);
  return photos[0] ?? null;
}

export async function pickDamagePhotos(
  source: 'camera' | 'library',
  coordinates?: Coordinates,
  allowMultiple = source === 'library',
): Promise<Attachment[]> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Media permission denied');

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: Platform.OS === 'web',
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsMultipleSelection: allowMultiple,
          selectionLimit: allowMultiple ? 20 : 1,
          base64: Platform.OS === 'web',
        });
  if (!hasPickerAssets(result) || !result.assets) return [];

  const photos: Attachment[] = [];
  for (const asset of result.assets) {
    const localUri = await persistPickedImage(asset);
    photos.push({
      id: cryptoRandomId(),
      localUri,
      sectionRef: 'photos',
      coordinates,
      syncState: 'pending',
    });
  }
  return photos;
}

async function persistPickedImage(asset: ImagePicker.ImagePickerAsset) {
  const fallback = persistableImageUri(asset);
  try {
    const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
    context.resize({ width: 1600 });
    const rendered = await context.renderAsync();
    const compressed = await rendered.saveAsync({
      compress: 0.72,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: Platform.OS === 'web',
    });
    if (compressed.base64) {
      return persistableImageUri({
        uri: compressed.uri,
        base64: compressed.base64,
        mimeType: 'image/jpeg',
      });
    }
    if (Platform.OS === 'web') {
      return await readUriAsDataUri(compressed.uri).catch(() => fallback);
    }
    return compressed.uri;
  } catch {
    if (Platform.OS === 'web' && !fallback.startsWith('data:')) {
      return readUriAsDataUri(asset.uri).catch(() => fallback);
    }
    return fallback;
  }
}

async function readUriAsDataUri(uri: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image'));
    reader.readAsDataURL(blob);
  });
}
