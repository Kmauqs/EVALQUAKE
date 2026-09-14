/** Sanitize Firestore doc ids (no slashes). */
export function jobDocumentId(dedupeKey: string) {
  return dedupeKey.replaceAll('/', '_').slice(0, 700);
}
