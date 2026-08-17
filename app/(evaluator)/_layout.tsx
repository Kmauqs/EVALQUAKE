import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useAuth } from '@/auth/AuthProvider';

export default function EvaluatorLayout() {
  const { configured, loading, role, user } = useAuth();
  if (!loading && configured && (!user || role !== 'evaluator')) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
