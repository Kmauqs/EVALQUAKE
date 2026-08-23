import { describe, expect, it } from 'vitest';

import { PHOTO_MAX_EDGE, targetPhotoSize } from '@/domain/imageCompression';

describe('targetPhotoSize', () => {
  it('keeps small images unchanged', () => {
    expect(targetPhotoSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('scales landscape photos to the max edge', () => {
    expect(targetPhotoSize(4000, 3000, PHOTO_MAX_EDGE)).toEqual({ width: 1280, height: 960 });
  });

  it('scales portrait photos to the max edge', () => {
    expect(targetPhotoSize(3000, 4000, PHOTO_MAX_EDGE)).toEqual({ width: 960, height: 1280 });
  });
});
