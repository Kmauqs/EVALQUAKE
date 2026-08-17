import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { Language } from '@/domain/evaluation';
import { en, es } from './translations';

type Translation = typeof es | typeof en;

interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translation;
}

const I18nContext = createContext<I18nValue | null>(null);
const LANGUAGE_KEY = 'evalquake.language';

export function I18nProvider({ children }: React.PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>('es');

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((value) => {
      if (value === 'es' || value === 'en') setLanguageState(value);
    });
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    void AsyncStorage.setItem(LANGUAGE_KEY, next);
  };

  const value = useMemo(
    () => ({ language, setLanguage, t: language === 'es' ? es : en }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
