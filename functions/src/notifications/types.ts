export type NotificationType =
  | 'user.registration_pending'
  | 'evaluation.submitted'
  | 'user.approved';

export interface NotificationEmail {
  subject: string;
  html: string;
  text: string;
}

export interface DispatchNotificationInput {
  type: NotificationType;
  recipientUids: string[];
  title: string;
  body: string;
  href?: string;
  email: NotificationEmail;
  dedupeKey: string;
  meta?: Record<string, string>;
}

export interface DispatchNotificationResult {
  skipped: boolean;
  recipientCount: number;
  mailCount: number;
  inboxCount: number;
}
