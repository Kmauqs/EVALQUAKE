import { defineString } from 'firebase-functions/params';

import type { NotificationEmail } from './types';

export const appBaseUrl = defineString('APP_BASE_URL', {
  default: 'https://evalquake.web.app',
  description: 'Public web app URL used in notification email links',
});

export function getAppBaseUrl() {
  try {
    return appBaseUrl.value().replace(/\/$/, '');
  } catch {
    return 'https://evalquake.web.app';
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function wrapHtml(title: string, paragraphs: string[], href?: string) {
  const link = href
    ? `<p><a href="${escapeHtml(href)}">Abrir EVALQUAKE</a></p>`
    : '';
  return `<!DOCTYPE html>
<html lang="es">
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1a1a1a;">
  <h1 style="font-size: 1.25rem;">${escapeHtml(title)}</h1>
  ${paragraphs.map((p) => `<p>${p}</p>`).join('\n  ')}
  ${link}
  <p style="color: #666; font-size: 0.875rem;">EVALQUAKE — notificación automática</p>
</body>
</html>`;
}

function absoluteHref(path: string | undefined, baseUrl: string) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl.replace(/\/$/, '')}${normalized}`;
}

export function registrationPendingEmail(
  input: { email: string; userId: string },
  baseUrl = getAppBaseUrl(),
): NotificationEmail {
  const title = 'Nueva solicitud de usuario';
  const href = absoluteHref('/(admin)', baseUrl);
  const safeEmail = escapeHtml(input.email || '(sin correo)');
  return {
    subject: 'EVALQUAKE: solicitud de acceso',
    html: wrapHtml(
      title,
      [
        `<strong>${safeEmail}</strong> se registró y espera autorización de rol y jurisdicción.`,
        `ID: <code>${escapeHtml(input.userId)}</code>`,
      ],
      href,
    ),
    text: [
      title,
      '',
      `${input.email || '(sin correo)'} se registró y espera autorización.`,
      `ID: ${input.userId}`,
      href ? `Abrir: ${href}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

export function evaluationSubmittedEmail(
  input: {
    evaluationId: string;
    jurisdictionId: string;
    officialNumber?: number | null;
    habitability?: string;
  },
  baseUrl = getAppBaseUrl(),
): NotificationEmail {
  const numberLabel =
    input.officialNumber != null ? `#${input.officialNumber}` : input.evaluationId;
  const title = 'Nueva evaluación enviada';
  const href = absoluteHref(`/(coordinator)/evaluation/${input.evaluationId}`, baseUrl);
  return {
    subject: `EVALQUAKE: evaluación enviada (${numberLabel})`,
    html: wrapHtml(
      title,
      [
        `Se envió la evaluación <strong>${escapeHtml(numberLabel)}</strong>.`,
        `Jurisdicción: <strong>${escapeHtml(input.jurisdictionId)}</strong>`,
        input.habitability
          ? `Habitabilidad: <strong>${escapeHtml(input.habitability)}</strong>`
          : '',
      ].filter(Boolean),
      href,
    ),
    text: [
      title,
      '',
      `Evaluación: ${numberLabel}`,
      `Jurisdicción: ${input.jurisdictionId}`,
      input.habitability ? `Habitabilidad: ${input.habitability}` : '',
      href ? `Abrir: ${href}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

export function userApprovedEmail(
  input: { role: string; jurisdictionIds: string[] },
  baseUrl = getAppBaseUrl(),
): NotificationEmail {
  const title = 'Cuenta autorizada';
  const href = absoluteHref('/', baseUrl);
  const jurisdictions = input.jurisdictionIds.join(', ') || '(ninguna)';
  return {
    subject: 'EVALQUAKE: acceso autorizado',
    html: wrapHtml(
      title,
      [
        `Tu solicitud fue aprobada.`,
        `Rol: <strong>${escapeHtml(input.role)}</strong>`,
        `Jurisdicciones: <strong>${escapeHtml(jurisdictions)}</strong>`,
      ],
      href,
    ),
    text: [
      title,
      '',
      'Tu solicitud fue aprobada.',
      `Rol: ${input.role}`,
      `Jurisdicciones: ${jurisdictions}`,
      href ? `Abrir: ${href}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
