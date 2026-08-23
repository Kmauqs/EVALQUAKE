import { Platform } from 'react-native';

const implementation = () =>
  Platform.OS === 'web' ? import('./mediaStore.web') : import('./mediaStore.native');

export async function saveMedia(id: string, dataUri: string) {
  return (await implementation()).saveMedia(id, dataUri);
}

export async function loadMedia(id: string) {
  return (await implementation()).loadMedia(id);
}
