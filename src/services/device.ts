import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { Attachment, Coordinates } from '@/domain/evaluation';
import { cryptoRandomId } from '@/domain/evaluation';
import { hasPickerAssets } from '@/domain/imageUri';
import { persistImage } from '@/services/imagePersistence';

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
    const id = cryptoRandomId();
    const localUri = await persistImage(id, asset);
    photos.push({
      id,
      localUri,
      sectionRef: 'photos',
      coordinates,
      syncState: 'pending',
    });
  }
  return photos;
}
