import { useEffect, useMemo, useState } from 'react';

import type { Language } from '@/domain/evaluation';
import { markdownFromDoc, subscribeGuideContent } from '@/firebase/guide';
import type { GuideBlock } from '@/guide/content';
import { resolveGuideBlocks } from '@/guide/markdown';

export function useGuideBlocks(language: Language): GuideBlock[] {
  const [markdown, setMarkdown] = useState('');

  useEffect(
    () =>
      subscribeGuideContent((content) => {
        setMarkdown(markdownFromDoc(content, language));
      }),
    [language],
  );

  return useMemo(() => resolveGuideBlocks(language, markdown), [language, markdown]);
}
