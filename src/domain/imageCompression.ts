/** Longest side for field photos uploaded to Storage and embedded in PDF reports. */
export const PHOTO_MAX_EDGE = 1280;
/** JPEG quality after resize (0–1). Lower = smaller Firebase objects and PDF files. */
export const PHOTO_JPEG_QUALITY = 0.65;

export function targetPhotoSize(width: number, height: number, maxEdge = PHOTO_MAX_EDGE) {
  const longest = Math.max(width, height);
  if (!Number.isFinite(longest) || longest <= 0 || longest <= maxEdge) {
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
