import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth/AuthProvider';
import { PushBootstrap } from '@/components/PushBootstrap';
import { I18nProvider } from '@/i18n/I18nProvider';
import { EvaluationProvider } from '@/state/EvaluationProvider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <PushBootstrap />
          <EvaluationProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="guide" />
              <Stack.Screen name="(evaluator)" />
              <Stack.Screen name="(coordinator)" />
              <Stack.Screen name="(admin)" />
            </Stack>
          </EvaluationProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
