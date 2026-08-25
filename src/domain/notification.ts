export type NotificationType =
  | 'user.registration_pending'
  | 'evaluation.submitted'
  | 'user.approved';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  readAt: string | null;
  createdAt: string;
  dedupeKey: string;
  meta?: Record<string, string>;
}

const NOTIFICATION_TYPES: NotificationType[] = [
  'user.registration_pending',
  'evaluation.submitted',
  'user.approved',
];

export function isUnread(notification: AppNotification) {
  return notification.readAt == null;
}

export function hrefFromNotificationData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const href = (data as { href?: unknown }).href;
  return typeof href === 'string' && href.trim() ? href.trim() : null;
}

export function parseAppNotification(
  id: string,
  data: Record<string, unknown>,
): AppNotification | null {
  const type = data.type;
  if (typeof type !== 'string' || !NOTIFICATION_TYPES.includes(type as NotificationType)) {
    return null;
  }
  const title = typeof data.title === 'string' ? data.title : '';
  const body = typeof data.body === 'string' ? data.body : '';
  if (!title && !body) return null;
  return {
    id,
    type: type as NotificationType,
    title,
    body,
    href: typeof data.href === 'string' ? data.href : null,
    readAt: typeof data.readAt === 'string' ? data.readAt : null,
    createdAt:
      typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
    dedupeKey: typeof data.dedupeKey === 'string' ? data.dedupeKey : id,
    meta:
      data.meta && typeof data.meta === 'object' && !Array.isArray(data.meta)
        ? Object.fromEntries(
            Object.entries(data.meta as Record<string, unknown>).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string',
            ),
          )
        : undefined,
  };
}
