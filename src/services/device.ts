import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import type { Attachment, Coordinates } from '@/domain/evaluation';
import { cryptoRandomId } from '@/domain/evaluation';

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
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Media permission denied');

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (result.canceled || !result.assets[0]) return null;

  const context = ImageManipulator.ImageManipulator.manipulate(result.assets[0].uri);
  context.resize({ width: 1600, height: null });
  const rendered = await context.renderAsync();
  const compressed = await rendered.saveAsync({
    compress: 0.72,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return {
    id: cryptoRandomId(),
    localUri: compressed.uri,
    sectionRef: 'photos',
    coordinates,
    syncState: 'pending',
  };
}
