import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useAuth } from '@/auth/AuthProvider';

// Evaluators reach the same screens in read-only mode: they only see the evaluations of
// the work groups a coordinator assigned them to, and get no moderation actions.
const ALLOWED_ROLES = ['evaluator', 'coordinator', 'admin'];

export default function CoordinatorLayout() {
  const { configured, loading, role, user } = useAuth();
  if (!loading && configured && (!user || !ALLOWED_ROLES.includes(role ?? ''))) {
    return <Redirect href="/" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
