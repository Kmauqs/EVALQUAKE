import { type Href, useRouter } from 'expo-router';
import { useCallback } from 'react';

export function useSafeBack(fallback: Href) {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallback);
  }, [fallback, router]);
}
