import { describe, expect, it } from 'vitest';

import { firestoreEvaluationDocument, omitUndefined } from './firestorePayload';

describe('firestore payload', () => {
  it('strips undefined fields that would make setDoc fail', () => {
    expect(omitUndefined({ a: 1, b: undefined, c: { d: undefined, e: 'ok' } })).toEqual({
      a: 1,
      c: { e: 'ok' },
    });
  });

  it('omits local PDF blobs from the remote document', () => {
    expect(
      firestoreEvaluationDocument({
        id: 'eq-1',
        localPdfUri: 'data:application/pdf,huge',
        sketchStoragePath: undefined,
        officialNumber: null,
      }),
    ).toEqual({ id: 'eq-1', officialNumber: null });
  });

  it('does not send data URIs or local media schemes to Firestore', () => {
    expect(
      firestoreEvaluationDocument({
        id: 'eq-1',
        signatureUri: 'data:image/png;base64,aaa',
        sketchUri: 'evalquake-media:sketch-1',
        photos: [{ id: 'p1', localUri: 'data:image/jpeg;base64,bbb' }],
      }),
    ).toEqual({
      id: 'eq-1',
      signatureUri: '',
      sketchUri: '',
      photos: [{ id: 'p1', localUri: '' }],
    });
  });

  it('keeps FieldValue sentinels after JSON sanitizing', () => {
    const sentinel = { isEqual: () => true };
    expect(
      firestoreEvaluationDocument({
        id: 'eq-1',
        serverUpdatedAt: sentinel,
      }).serverUpdatedAt,
    ).toBe(sentinel);
  });
});
