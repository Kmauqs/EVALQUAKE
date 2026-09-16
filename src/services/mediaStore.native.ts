import * as FileSystem from 'expo-file-system/legacy';

function mediaDirectory() {
  return `${FileSystem.documentDirectory}evalquake-media/`;
}

function mediaPath(id: string) {
  return `${mediaDirectory()}${id}.jpg`;
}

async function ensureDirectory() {
  const directory = mediaDirectory();
  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }
}

export async function saveMedia(id: string, dataUri: string) {
  const base64 = dataUri.includes(',') ? dataUri.slice(dataUri.indexOf(',') + 1) : '';
  if (!base64) throw new Error('Could not persist photo');
  await ensureDirectory();
  await FileSystem.writeAsStringAsync(mediaPath(id), base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function loadMedia(id: string) {
  const path = mediaPath(id);
  const info = await FileSystem.getInfoAsync(path);
  return info.exists ? path : null;
}
