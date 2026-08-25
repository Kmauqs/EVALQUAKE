import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  disableDeviceToken,
  nativePushPlatform,
  upsertDeviceToken,
} from '@/firebase/devices';

const TOKEN_KEY = 'evalquake.pushToken';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function easProjectId() {
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId
  );
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'EVALQUAKE',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function ensurePushRegistration(uid: string) {
  const platform = nativePushPlatform();
  if (!platform || !uid) return null;
  if (!Device.isDevice) return null;

  await ensureAndroidChannel();
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

  const projectId = easProjectId();
  if (!projectId) return null;

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResult.data;
  await upsertDeviceToken(uid, token, platform);
  await AsyncStorage.setItem(TOKEN_KEY, token);
  return token;
}

export async function clearPushRegistration(uid: string) {
  if (!uid || Platform.OS === 'web') return;
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    try {
      await disableDeviceToken(uid, token);
    } catch {
      /* best-effort */
    }
  }
  await AsyncStorage.removeItem(TOKEN_KEY);
}
