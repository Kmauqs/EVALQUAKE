export function isExpoPushToken(token: unknown): token is string {
  if (typeof token !== 'string') return false;
  const value = token.trim();
  return value.startsWith('ExponentPushToken[') || value.startsWith('ExpoPushToken[');
}
