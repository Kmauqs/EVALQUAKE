import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export async function openHtmlDocument(html: string, filename = 'evalquake-report.html') {
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, html);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/html',
      dialogTitle: 'EVALQUAKE',
    });
  }
  return uri;
}
