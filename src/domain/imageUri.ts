export function dataUriFromBase64(base64: string, mime = 'image/jpeg') {
  return `data:${mime};base64,${base64}`;
}

export function persistableImageUri(asset: { uri: string; base64?: string | null; mimeType?: string | null }) {
  if (asset.uri.startsWith('data:')) return asset.uri;
  if (asset.base64) return dataUriFromBase64(asset.base64, asset.mimeType || 'image/jpeg');
  return asset.uri;
}

export function hasPickerAssets(result: { canceled?: boolean; assets?: unknown[] | null }) {
  return !result.canceled && Boolean(result.assets?.length);
}
