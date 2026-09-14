function remoteOnlyUri(value: unknown) {
  if (typeof value !== 'string') return value;
  return value.startsWith('https://') || value.startsWith('http://') ? value : '';
}

export function omitUndefined(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (typeof value === 'number' && !Number.isFinite(value)) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (typeof (value as { isEqual?: unknown }).isEqual === 'function') return value;
  if (Array.isArray(value)) {
    return value.map(omitUndefined).filter((item) => item !== undefined);
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (item === undefined) continue;
    const next = omitUndefined(item);
    if (next === undefined) continue;
    result[key] = next;
  }
  return result;
}

export function firestoreEvaluationDocument(evaluation: Record<string, unknown>) {
  const { localPdfUri: _localPdf, serverUpdatedAt, ...rest } = evaluation;
  const photos = Array.isArray(rest.photos)
    ? rest.photos.map((photo) =>
        photo && typeof photo === 'object'
          ? { ...(photo as Record<string, unknown>), localUri: remoteOnlyUri((photo as { localUri?: unknown }).localUri) }
          : photo,
      )
    : rest.photos;
  const cleaned = omitUndefined({
    ...rest,
    photos,
    sketchUri: remoteOnlyUri(rest.sketchUri),
    signatureUri: remoteOnlyUri(rest.signatureUri),
  }) as Record<string, unknown>;
  const jsonSafe = JSON.parse(JSON.stringify(cleaned)) as Record<string, unknown>;
  if (serverUpdatedAt !== undefined) jsonSafe.serverUpdatedAt = serverUpdatedAt;
  return jsonSafe;
}
