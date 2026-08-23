import { Alert, Platform } from 'react-native';

export function notify(title: string, message: string) {
  const text = message.trim() ? `${title}\n\n${message}` : title;
  if (Platform.OS === 'web') {
    globalThis.alert(text);
    return;
  }
  Alert.alert(title, message);
}
