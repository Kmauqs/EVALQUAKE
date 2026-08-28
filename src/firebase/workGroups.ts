import { collection, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { asWorkGroup, type WorkGroup } from '@/domain/workGroup';
import { getFirebaseServices } from './client';

export function subscribeWorkGroups(
  onChange: (groups: WorkGroup[]) => void,
  onError?: (error: Error) => void,
) {
  const services = getFirebaseServices();
  if (!services) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    collection(services.db, 'workGroups'),
    (snapshot) =>
      onChange(
        snapshot.docs
          .map((item) => asWorkGroup(item.id, item.data()))
          .sort((left, right) => left.name.localeCompare(right.name)),
      ),
    (error) => onError?.(error),
  );
}

export async function createWorkGroup(input: {
  name: string;
  memberUids: string[];
}): Promise<string> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured');
  const result = await httpsCallable(services.functions, 'createWorkGroup')(input);
  return String((result.data as { groupId?: unknown })?.groupId ?? '');
}

export async function updateWorkGroup(input: {
  groupId: string;
  name?: string;
  memberUids?: string[];
  coordinatorUids?: string[];
}): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured');
  await httpsCallable(services.functions, 'updateWorkGroup')(input);
}

export async function deleteWorkGroup(groupId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured');
  await httpsCallable(services.functions, 'deleteWorkGroup')({ groupId });
}

/** Maps a callable rejection onto the copy shown in the group editor. */
export function workGroupErrorMessage(
  error: unknown,
  messages: { duplicateName: string; notAuthorized: string; fallback: string },
) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code.includes('already-exists')) return messages.duplicateName;
  if (code.includes('failed-precondition')) return messages.notAuthorized;
  return messages.fallback;
}
