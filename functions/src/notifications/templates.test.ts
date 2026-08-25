import { describe, expect, it } from 'vitest';

import { jobDocumentId } from './ids';
import {
  evaluationSubmittedEmail,
  registrationPendingEmail,
  userApprovedEmail,
} from './templates';

describe('notification templates', () => {
  const base = 'https://evalquake.web.app';

  it('builds registration pending email for admins', () => {
    const mail = registrationPendingEmail(
      { email: 'nuevo@example.com', userId: 'uid-1' },
      base,
    );
    expect(mail.subject).toContain('solicitud');
    expect(mail.html).toContain('nuevo@example.com');
    expect(mail.html).toContain('uid-1');
    expect(mail.text).toContain('https://evalquake.web.app/(admin)');
  });

  it('escapes html in registration email', () => {
    const mail = registrationPendingEmail(
      { email: '<script>x</script>@x.com', userId: 'a&b' },
      base,
    );
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('a&amp;b');
  });

  it('builds evaluation submitted email', () => {
    const mail = evaluationSubmittedEmail(
      {
        evaluationId: 'ev-9',
        jurisdictionId: 'Bogotá',
        officialNumber: 42,
        habitability: 'unsafe',
      },
      base,
    );
    expect(mail.subject).toContain('#42');
    expect(mail.html).toContain('Bogotá');
    expect(mail.html).toContain('unsafe');
    expect(mail.text).toContain('/(coordinator)/evaluation/ev-9');
  });

  it('builds user approved email', () => {
    const mail = userApprovedEmail(
      { role: 'evaluator', jurisdictionIds: ['Nacional'] },
      base,
    );
    expect(mail.subject).toContain('autorizado');
    expect(mail.html).toContain('evaluator');
    expect(mail.html).toContain('Nacional');
  });
});

describe('jobDocumentId', () => {
  it('sanitizes slashes for Firestore document ids', () => {
    expect(jobDocumentId('user.approved:uid/with/slash:evaluator')).toBe(
      'user.approved:uid_with_slash:evaluator',
    );
  });
});
