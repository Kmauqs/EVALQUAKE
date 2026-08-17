import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { UserRole } from '@/domain/evaluation';
import { firebaseConfigured, getFirebaseServices } from '@/firebase/client';

interface AuthState {
  user: User | null;
  uid: string;
  role: UserRole;
  jurisdictionIds: string[];
  loading: boolean;
  configured: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('evaluator');
  const [jurisdictionIds, setJurisdictionIds] = useState<string[]>(['jurisdiction-demo']);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    const services = getFirebaseServices();
    if (!services) return;
    return onAuthStateChanged(services.auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        const token = await nextUser.getIdTokenResult();
        const claimedRole = token.claims.role;
        setRole(
          claimedRole === 'coordinator' || claimedRole === 'admin' ? claimedRole : 'evaluator',
        );
        setJurisdictionIds(
          Array.isArray(token.claims.jurisdictionIds)
            ? token.claims.jurisdictionIds.filter(
                (value): value is string => typeof value === 'string',
              )
            : [],
        );
      } else {
        setRole('evaluator');
        setJurisdictionIds([]);
      }
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      uid: user?.uid ?? 'demo-evaluator',
      role,
      jurisdictionIds,
      loading,
      configured: firebaseConfigured,
      login: async (email, password) => {
        const services = getFirebaseServices();
        if (!services) return;
        await signInWithEmailAndPassword(services.auth, email.trim(), password);
      },
      logout: async () => {
        const services = getFirebaseServices();
        if (services) await firebaseSignOut(services.auth);
      },
    }),
    [user, role, jurisdictionIds, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
