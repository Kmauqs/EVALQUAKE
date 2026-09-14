import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { canAccessEvaluatorWorkspace } from '@/domain/user';

export default function EvaluatorLayout() {
  const { configured, loading, role, user } = useAuth();
  if (!loading && configured && (!user || !canAccessEvaluatorWorkspace(role))) {
    return <Redirect href="/" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
