import { Platform } from 'react-native';

export async function openHtmlDocument(html: string, filename = 'evalquake-report.html') {
  if (Platform.OS === 'web') {
    return (await import('./htmlDocument.web')).openHtmlDocument(html);
  }
  return (await import('./htmlDocument.native')).openHtmlDocument(html, filename);
}
