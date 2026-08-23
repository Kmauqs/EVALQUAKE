import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import {
  connectFunctionsEmulator,
  getFunctions,
  type Functions,
} from 'firebase/functions';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(
  config.apiKey &&
    config.projectId &&
    config.appId &&
    config.apiKey !== 'replace-me' &&
    config.projectId !== 'your-project',
);

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
}

let services: FirebaseServices | null = null;
let emulatorsConnected = false;

function createAuth(app: FirebaseApp): Auth {
  try {
    if (Platform.OS === 'web') {
      return initializeAuth(app, { persistence: browserLocalPersistence });
    }
    const reactNativePersistence = (
      // Native Firebase Auth typings omit this helper in the web export used by tsc.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('firebase/auth') as {
        getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
      }
    ).getReactNativePersistence;
    if (reactNativePersistence) {
      return initializeAuth(app, { persistence: reactNativePersistence(AsyncStorage) });
    }
    return initializeAuth(app);
  } catch {
    return getAuth(app);
  }
}

export function getFirebaseServices(): FirebaseServices | null {
  if (!firebaseConfigured) return null;
  if (services) return services;

  const app = getApps().length ? getApp() : initializeApp(config);
  let db: Firestore;
  try {
    db = initializeFirestore(app, {
      localCache:
        Platform.OS === 'web'
          ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
          : memoryLocalCache(),
    });
  } catch {
    db = getFirestore(app);
  }

  const auth = createAuth(app);
  const storage = getStorage(app);
  const functions = getFunctions(app, 'us-central1');

  if (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS === 'true' && !emulatorsConnected) {
    const host = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
    connectFirestoreEmulator(db, host, 8080);
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectStorageEmulator(storage, host, 9199);
    connectFunctionsEmulator(functions, host, 5001);
    emulatorsConnected = true;
  }

  services = { app, auth, db, storage, functions };
  return services;
}
