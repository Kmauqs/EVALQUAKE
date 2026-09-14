import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useAuth } from '@/auth/AuthProvider';

export default function AdminLayout() {
  const { configured, loading, role, user } = useAuth();
  if (loading) return null;
  if (configured && (!user || role !== 'admin')) {
    return <Redirect href="/" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
