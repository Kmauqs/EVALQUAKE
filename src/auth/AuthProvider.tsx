import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

import type { UserRole } from '@/domain/evaluation';
import type { AccountStatus, AppUser } from '@/domain/user';
import { clearSessionMarker, isSessionExpired, markSessionStart, prepareSession } from '@/auth/session';
import { firebaseConfigured, getFirebaseServices } from '@/firebase/client';
import { ensureUserProfile, subscribeUserProfile } from '@/firebase/users';
import { clearPushRegistration } from '@/services/push';

interface AuthState {
  user: User | null;
  uid: string;
  role: UserRole | null;
  jurisdictionIds: string[];
  groupIds: string[];
  status: AccountStatus;
  profile: AppUser | null;
  loading: boolean;
  configured: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccess: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function roleFromClaims(claims: Record<string, unknown>): UserRole | null {
  const claimedRole = claims.role;
  return claimedRole === 'evaluator' || claimedRole === 'coordinator' || claimedRole === 'admin'
    ? claimedRole
    : null;
}

function stringListFromClaims(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function sameIds(left: string[], right: string[]) {
  return left.length === right.length && [...left].sort().join('|') === [...right].sort().join('|');
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(firebaseConfigured ? null : 'evaluator');
  const [jurisdictionIds, setJurisdictionIds] = useState<string[]>(
    firebaseConfigured ? [] : ['jurisdiction-demo'],
  );
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [status, setStatus] = useState<AccountStatus>(firebaseConfigured ? 'pending' : 'active');
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const groupIdsRef = useRef<string[]>(groupIds);
  useEffect(() => {
    groupIdsRef.current = groupIds;
  }, [groupIds]);

  const refreshAccess = useCallback(async () => {
    const current = getFirebaseServices()?.auth.currentUser;
    if (!current) return;
    const token = await current.getIdTokenResult(true);
    const claimedRole = roleFromClaims(token.claims);
    setRole(claimedRole);
    setJurisdictionIds(stringListFromClaims(token.claims.jurisdictionIds));
    setGroupIds(stringListFromClaims(token.claims.groupIds));
    setStatus((currentStatus) =>
      claimedRole ? 'active' : currentStatus === 'disabled' ? 'disabled' : 'pending',
    );
  }, []);

  useEffect(() => {
    const services = getFirebaseServices();
    if (!services) return;
    return onAuthStateChanged(services.auth, async (nextUser) => {
      if (nextUser && (await isSessionExpired())) {
        await firebaseSignOut(services.auth);
        await clearSessionMarker();
        return;
      }
      setUser(nextUser);
      if (!nextUser) {
        setRole(null);
        setJurisdictionIds([]);
        setGroupIds([]);
        setStatus('pending');
        setProfile(null);
        setLoading(false);
        return;
      }

      const token = await nextUser.getIdTokenResult();
      const claimedRole = roleFromClaims(token.claims);
      setRole(claimedRole);
      setJurisdictionIds(stringListFromClaims(token.claims.jurisdictionIds));
      setGroupIds(stringListFromClaims(token.claims.groupIds));
      setStatus(claimedRole ? 'active' : 'pending');
      void ensureUserProfile().catch(() => undefined);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    return subscribeUserProfile(user.uid, (nextProfile) => {
      setProfile(nextProfile);
      if (!nextProfile) return;
      // The server mirrors work group membership onto the profile right after updating the
      // custom claims, so a divergence means our ID token is stale.
      if (!sameIds(nextProfile.groupIds, groupIdsRef.current)) {
        void refreshAccess().catch(() => undefined);
      }
      if (nextProfile.disabled || nextProfile.status === 'disabled') {
        setStatus('disabled');
        return;
      }
      if (role) {
        setStatus('active');
        return;
      }
      setStatus(nextProfile.status);
    });
  }, [refreshAccess, role, user]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      uid: user?.uid ?? (firebaseConfigured ? '' : 'demo-evaluator'),
      role,
      jurisdictionIds,
      groupIds,
      status,
      profile,
      loading,
      configured: firebaseConfigured,
      login: async (email, password, remember = true) => {
        const services = getFirebaseServices();
        if (!services) return;
        prepareSession(remember);
        if (Platform.OS === 'web') {
          await setPersistence(
            services.auth,
            remember ? browserLocalPersistence : browserSessionPersistence,
          );
        }
        await signInWithEmailAndPassword(services.auth, email.trim(), password);
        await markSessionStart(remember);
      },
      register: async (email, password, remember = true) => {
        const services = getFirebaseServices();
        if (!services) return;
        prepareSession(remember);
        if (Platform.OS === 'web') {
          await setPersistence(
            services.auth,
            remember ? browserLocalPersistence : browserSessionPersistence,
          );
        }
        await createUserWithEmailAndPassword(services.auth, email.trim(), password);
        await markSessionStart(remember);
      },
      logout: async () => {
        const services = getFirebaseServices();
        const currentUid = services?.auth.currentUser?.uid;
        if (currentUid) await clearPushRegistration(currentUid).catch(() => undefined);
        await clearSessionMarker();
        if (services) await firebaseSignOut(services.auth);
      },
      refreshAccess,
    }),
    [groupIds, jurisdictionIds, loading, profile, refreshAccess, role, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

export function authErrorMessage(
  error: unknown,
  fallback: string,
  messages: {
    emailInUse: string;
    weakPassword: string;
    invalidEmail: string;
    disabled: string;
  },
) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code.includes('email-already-in-use')) return messages.emailInUse;
  if (code.includes('weak-password')) return messages.weakPassword;
  if (code.includes('invalid-email')) return messages.invalidEmail;
  if (code.includes('user-disabled')) return messages.disabled;
  return fallback;
}
