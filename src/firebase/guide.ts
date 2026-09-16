import { doc, onSnapshot, setDoc } from 'firebase/firestore';

import type { Language } from '@/domain/evaluation';
import { getFirebaseServices } from './client';

export const GUIDE_CONTENT_DOC = 'guide';

export interface GuideContentDoc {
  es: string;
  en: string;
  updatedAt: string;
  updatedBy: string;
  updatedByEmail: string;
}

export function subscribeGuideContent(
  onChange: (content: GuideContentDoc | null) => void,
  onError?: (error: Error) => void,
) {
  const services = getFirebaseServices();
  if (!services) {
    onChange(null);
    return () => undefined;
  }
  return onSnapshot(
    doc(services.db, 'content', GUIDE_CONTENT_DOC),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      const data = snapshot.data();
      onChange({
        es: typeof data.es === 'string' ? data.es : '',
        en: typeof data.en === 'string' ? data.en : '',
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
        updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : '',
        updatedByEmail: typeof data.updatedByEmail === 'string' ? data.updatedByEmail : '',
      });
    },
    (error) => onError?.(error),
  );
}

export function markdownFromDoc(content: GuideContentDoc | null, language: Language) {
  if (!content) return '';
  return language === 'en' ? content.en : content.es;
}

export async function saveGuideContent(patch: Pick<GuideContentDoc, 'es' | 'en' | 'updatedBy' | 'updatedByEmail'>) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured');
  await setDoc(
    doc(services.db, 'content', GUIDE_CONTENT_DOC),
    {
      ...patch,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}
