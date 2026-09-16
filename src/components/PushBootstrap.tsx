import * as Notifications from 'expo-notifications';
import { type Href, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { hrefFromNotificationData } from '@/domain/notification';
import { ensurePushRegistration } from '@/services/push';

/** Registers push after sign-in and navigates on notification tap. */
export function PushBootstrap() {
  const { configured, uid, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!configured || !user || !uid || Platform.OS === 'web') return;
    void ensurePushRegistration(uid).catch(() => undefined);
  }, [configured, uid, user]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const navigate = (href: string | null) => {
      if (!href) return;
      router.push(href as Href);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigate(hrefFromNotificationData(response.notification.request.content.data));
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      navigate(hrefFromNotificationData(response.notification.request.content.data));
    });

    return () => subscription.remove();
  }, [router]);

  return null;
}
