import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useAuth } from '@/auth/AuthProvider';

export default function CoordinatorLayout() {
  const { configured, loading, role, user } = useAuth();
  if (!loading && configured && (!user || !['coordinator', 'admin'].includes(role))) {
    return <Redirect href="/" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
