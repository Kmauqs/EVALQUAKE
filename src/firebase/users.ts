import {
  collection,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import type { UserRole } from '@/domain/evaluation';
import type { AppUser } from '@/domain/user';
import { getFirebaseServices } from './client';

function asAppUser(id: string, data: Record<string, unknown>): AppUser {
  const role = data.role;
  const status = data.status;
  return {
    id,
    email: typeof data.email === 'string' ? data.email : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
    role: role === 'evaluator' || role === 'coordinator' || role === 'admin' ? role : null,
    jurisdictionIds: Array.isArray(data.jurisdictionIds)
      ? data.jurisdictionIds.filter((value): value is string => typeof value === 'string')
      : [],
    status: status === 'active' || status === 'disabled' ? status : 'pending',
    disabled: data.disabled === true,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
  };
}

export function subscribeUsers(
  onChange: (users: AppUser[]) => void,
  onError?: (error: Error) => void,
) {
  const services = getFirebaseServices();
  if (!services) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    collection(services.db, 'users'),
    (snapshot) =>
      onChange(
        snapshot.docs
          .map((item) => asAppUser(item.id, item.data()))
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      ),
    (error) => onError?.(error),
  );
}

export function subscribeUserProfile(
  userId: string,
  onChange: (user: AppUser | null) => void,
  onError?: (error: Error) => void,
) {
  const services = getFirebaseServices();
  if (!services) {
    onChange(null);
    return () => undefined;
  }
  return onSnapshot(
    doc(services.db, 'users', userId),
    (snapshot) =>
      onChange(snapshot.exists() ? asAppUser(snapshot.id, snapshot.data()) : null),
    (error) => onError?.(error),
  );
}

export async function ensureUserProfile(): Promise<AppUser | null> {
  const services = getFirebaseServices();
  if (!services) return null;
  const callable = httpsCallable(services.functions, 'ensureUserProfile');
  const result = await callable();
  const data = result.data as Record<string, unknown> | null;
  if (!data || typeof data !== 'object') return null;
  return asAppUser(String(data.id ?? ''), data);
}

export async function setUserRole(input: {
  userId: string;
  role: UserRole;
  jurisdictionIds: string[];
}): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured');
  await httpsCallable(services.functions, 'setUserRole')(input);
}

export async function setUserDisabled(input: {
  userId: string;
  disabled: boolean;
}): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured');
  await httpsCallable(services.functions, 'setUserDisabled')(input);
}

export function parseJurisdictionIds(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
