import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { UserRole } from '@/domain/evaluation';
import type { AccountStatus, AppUser } from '@/domain/user';
import { firebaseConfigured, getFirebaseServices } from '@/firebase/client';
import { ensureUserProfile, subscribeUserProfile } from '@/firebase/users';

interface AuthState {
  user: User | null;
  uid: string;
  role: UserRole | null;
  jurisdictionIds: string[];
  status: AccountStatus;
  profile: AppUser | null;
  loading: boolean;
  configured: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
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

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(firebaseConfigured ? null : 'evaluator');
  const [jurisdictionIds, setJurisdictionIds] = useState<string[]>(
    firebaseConfigured ? [] : ['jurisdiction-demo'],
  );
  const [status, setStatus] = useState<AccountStatus>(firebaseConfigured ? 'pending' : 'active');
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    const services = getFirebaseServices();
    if (!services) return;
    return onAuthStateChanged(services.auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setRole(null);
        setJurisdictionIds([]);
        setStatus('pending');
        setProfile(null);
        setLoading(false);
        return;
      }

      const token = await nextUser.getIdTokenResult();
      const claimedRole = roleFromClaims(token.claims);
      setRole(claimedRole);
      setJurisdictionIds(
        Array.isArray(token.claims.jurisdictionIds)
          ? token.claims.jurisdictionIds.filter(
              (value): value is string => typeof value === 'string',
            )
          : [],
      );
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
  }, [role, user]);

  const refreshAccess = useCallback(async () => {
    const current = getFirebaseServices()?.auth.currentUser;
    if (!current) return;
    const token = await current.getIdTokenResult(true);
    const claimedRole = roleFromClaims(token.claims);
    setRole(claimedRole);
    setJurisdictionIds(
      Array.isArray(token.claims.jurisdictionIds)
        ? token.claims.jurisdictionIds.filter(
            (value): value is string => typeof value === 'string',
          )
        : [],
    );
    setStatus((currentStatus) =>
      claimedRole ? 'active' : currentStatus === 'disabled' ? 'disabled' : 'pending',
    );
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      uid: user?.uid ?? 'demo-evaluator',
      role,
      jurisdictionIds,
      status,
      profile,
      loading,
      configured: firebaseConfigured,
      login: async (email, password) => {
        const services = getFirebaseServices();
        if (!services) return;
        await signInWithEmailAndPassword(services.auth, email.trim(), password);
      },
      register: async (email, password) => {
        const services = getFirebaseServices();
        if (!services) return;
        await createUserWithEmailAndPassword(services.auth, email.trim(), password);
      },
      logout: async () => {
        const services = getFirebaseServices();
        if (services) await firebaseSignOut(services.auth);
      },
      refreshAccess,
    }),
    [jurisdictionIds, loading, profile, refreshAccess, role, status, user],
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
