import { describe, expect, it } from 'vitest';

import { dataUriFromBase64, hasPickerAssets, persistableImageUri } from './imageUri';

describe('image uri helpers', () => {
  it('builds a data URI from picker base64', () => {
    expect(persistableImageUri({ uri: 'blob:https://evalquake.web.app/1', base64: 'abc', mimeType: 'image/jpeg' })).toBe(
      'data:image/jpeg;base64,abc',
    );
    expect(persistableImageUri({ uri: 'data:image/png;base64,xyz' })).toBe('data:image/png;base64,xyz');
    expect(dataUriFromBase64('qq', 'image/webp')).toBe('data:image/webp;base64,qq');
  });

  it('treats a canceled or empty picker result as no photos', () => {
    expect(hasPickerAssets({ canceled: true, assets: null })).toBe(false);
    expect(hasPickerAssets({ canceled: false, assets: [] })).toBe(false);
    expect(hasPickerAssets({ canceled: false, assets: [{ uri: 'file://a.jpg' }] })).toBe(true);
  });
});
