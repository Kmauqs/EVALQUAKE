import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function createPdf(html: string) {
  const result = await Print.printToFileAsync({ html, base64: false });
  return result.uri;
}

export async function sharePdf(uri: string) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'EVALQUAKE',
    });
  }
}
