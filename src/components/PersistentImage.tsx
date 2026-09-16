import React, { useEffect, useState } from 'react';
import { Image, type ImageStyle, type StyleProp, View } from 'react-native';

import { isEphemeralImageUri, isInlineImageUri } from '@/domain/imageUri';
import { resolveImageUri } from '@/services/resolveImage';

export function PersistentImage({
  uri,
  storagePath,
  style,
  resizeMode = 'cover',
}: {
  uri?: string;
  storagePath?: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}) {
  const [source, setSource] = useState(() =>
    uri && isInlineImageUri(uri) && !isEphemeralImageUri(uri) ? uri : undefined,
  );

  useEffect(() => {
    let live = true;
    void resolveImageUri(uri, storagePath).then((next) => {
      if (live) setSource(next);
    });
    return () => {
      live = false;
    };
  }, [storagePath, uri]);

  if (!source) return <View style={style} />;
  return <Image source={{ uri: source }} resizeMode={resizeMode} style={style} />;
}
