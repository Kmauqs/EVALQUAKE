import { Platform } from 'react-native';

const implementation = () => (Platform.OS === 'web' ? import('./pdf.web') : import('./pdf.native'));

export async function createPdf(html: string): Promise<string> {
  return (await implementation()).createPdf(html);
}

export async function sharePdf(uri: string): Promise<void> {
  return (await implementation()).sharePdf(uri);
}
