import { describe, expect, it } from 'vitest';

import {
  dataUriFromBase64,
  hasPickerAssets,
  isEphemeralImageUri,
  isInlineImageUri,
  mediaIdFromUri,
  mediaUriFor,
  persistableImageUri,
} from './imageUri';

describe('image uri helpers', () => {
  it('builds a data URI from picker base64', () => {
    expect(persistableImageUri({ uri: 'blob:https://evalquake.web.app/1', base64: 'abc', mimeType: 'image/jpeg' })).toBe(
      'data:image/jpeg;base64,abc',
    );
    expect(persistableImageUri({ uri: 'data:image/png;base64,xyz' })).toBe('data:image/png;base64,xyz');
    expect(dataUriFromBase64('qq', 'image/webp')).toBe('data:image/webp;base64,qq');
  });

  it('keeps durable media references separate from temporary blob URLs', () => {
    expect(mediaUriFor('abc')).toBe('evalquake-media:abc');
    expect(mediaIdFromUri('evalquake-media:abc')).toBe('abc');
    expect(mediaIdFromUri('blob:https://evalquake.web.app/1')).toBeUndefined();
    expect(isEphemeralImageUri('blob:https://evalquake.web.app/1')).toBe(true);
    expect(isEphemeralImageUri('data:image/jpeg;base64,abc')).toBe(false);
    expect(isInlineImageUri('https://example.com/p.jpg')).toBe(true);
    expect(isInlineImageUri('evalquake-media:abc')).toBe(false);
  });

  it('treats a canceled or empty picker result as no photos', () => {
    expect(hasPickerAssets({ canceled: true, assets: null })).toBe(false);
    expect(hasPickerAssets({ canceled: false, assets: [] })).toBe(false);
    expect(hasPickerAssets({ canceled: false, assets: [{ uri: 'file://a.jpg' }] })).toBe(true);
  });
});
