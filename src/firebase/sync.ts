import * as Network from 'expo-network';

import { completeLocalSync, getLocalEvaluation, listOutboxIds, removeFromOutbox } from '@/services/localStore';
import { firebaseConfigured, getFirebaseServices } from './client';
import { deleteRemoteEvaluation, pushEvaluation } from './repository';

let syncing = false;

export async function syncOutbox() {
  if (syncing || !firebaseConfigured) return { synced: 0, failed: 0 };
  const currentUser = getFirebaseServices()?.auth.currentUser;
  if (!currentUser) return { synced: 0, failed: 0 };
  const network = await Network.getNetworkStateAsync();
  if (!network.isConnected || network.isInternetReachable === false) return { synced: 0, failed: 0 };

  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    for (const id of await listOutboxIds()) {
      const local = await getLocalEvaluation(id);
      if (!local) {
        try {
          await deleteRemoteEvaluation(id);
          await removeFromOutbox(id);
          synced += 1;
        } catch {
          failed += 1;
        }
        continue;
      }
      if (local.createdByUserId !== currentUser.uid) continue;
      try {
        const remote = await pushEvaluation({ ...local, syncState: 'syncing' });
        const completed = await completeLocalSync(id, local.updatedAt, remote);
        if (completed) synced += 1;
      } catch {
        failed += 1;
      }
    }
  } finally {
    syncing = false;
  }
  return { synced, failed };
}
