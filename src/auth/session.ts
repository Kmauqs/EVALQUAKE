import AsyncStorage from '@react-native-async-storage/async-storage';

const STARTED_AT_KEY = 'evalquake.sessionStartedAt';
const REMEMBER_KEY = 'evalquake.rememberSession';
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

let ephemeralUnlocked = false;

export function prepareSession(remember: boolean) {
  ephemeralUnlocked = !remember;
}

export async function markSessionStart(remember: boolean) {
  prepareSession(remember);
  if (!remember) {
    await AsyncStorage.setItem(REMEMBER_KEY, '0');
    await AsyncStorage.removeItem(STARTED_AT_KEY);
    return;
  }
  await AsyncStorage.setItem(REMEMBER_KEY, '1');
  await AsyncStorage.setItem(STARTED_AT_KEY, String(Date.now()));
}

export async function clearSessionMarker() {
  ephemeralUnlocked = false;
  await AsyncStorage.multiRemove([STARTED_AT_KEY, REMEMBER_KEY]);
}

export async function isSessionExpired() {
  const remember = await AsyncStorage.getItem(REMEMBER_KEY);
  if (remember === '0') return !ephemeralUnlocked;
  const startedAt = Number(await AsyncStorage.getItem(STARTED_AT_KEY));
  if (!startedAt) {
    await AsyncStorage.setItem(STARTED_AT_KEY, String(Date.now()));
    return false;
  }
  return Date.now() - startedAt > SESSION_DURATION_MS;
}
