import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { auth } from 'firebase-functions/v1';

import {
  dispatchNotification,
  listAdminUids,
  registrationPendingEmail,
  userApprovedEmail,
} from './notifications';

if (!getApps().length) initializeApp();

const db = getFirestore();
const VALID_ROLES = ['evaluator', 'coordinator', 'admin'] as const;
type ManagedRole = (typeof VALID_ROLES)[number];

function requireAdmin(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  if (request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Administrator role required.');
  }
  return request.auth;
}

function asProfile(userId: string, email: string, extra: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: userId,
    email,
    role: null,
    jurisdictionIds: [],
    status: 'pending',
    disabled: false,
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

function profileFromToken(
  userId: string,
  email: string,
  token: Record<string, unknown>,
) {
  const role =
    token.role === 'evaluator' || token.role === 'coordinator' || token.role === 'admin'
      ? token.role
      : null;
  const jurisdictionIds = Array.isArray(token.jurisdictionIds)
    ? token.jurisdictionIds.filter((value): value is string => typeof value === 'string')
    : [];
  return asProfile(userId, email, {
    role,
    jurisdictionIds,
    status: role ? 'active' : 'pending',
  });
}

async function notifyRegistrationPending(userId: string, email: string) {
  try {
    const admins = await listAdminUids();
    if (!admins.length) {
      logger.warn('No admins to notify for registration', { userId });
      return;
    }
    await dispatchNotification({
      type: 'user.registration_pending',
      recipientUids: admins,
      title: 'Nueva solicitud de usuario',
      body: `${email || '(sin correo)'} espera autorización`,
      href: '/(admin)',
      email: registrationPendingEmail({ email, userId }),
      dedupeKey: `user.registration_pending:${userId}`,
      meta: { userId, email },
    });
  } catch (error) {
    logger.error('Failed to notify admins of registration', { userId, error });
  }
}

export const onAuthUserCreated = auth.user().onCreate(async (user) => {
  const reference = db.doc(`users/${user.uid}`);
  const existing = await reference.get();
  if (existing.exists) return;
  const email = user.email ?? '';
  await reference.set(asProfile(user.uid, email));
  await notifyRegistrationPending(user.uid, email);
});

export const ensureUserProfile = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  const reference = db.doc(`users/${request.auth.uid}`);
  const existing = await reference.get();
  if (existing.exists) return { id: request.auth.uid, ...existing.data() };
  const profile = profileFromToken(
    request.auth.uid,
    String(request.auth.token.email ?? ''),
    request.auth.token as Record<string, unknown>,
  );
  await reference.set(profile);
  if (!profile.role && profile.status === 'pending') {
    await notifyRegistrationPending(request.auth.uid, profile.email);
  }
  return profile;
});

export const setUserRole = onCall({ region: 'us-central1' }, async (request) => {
  const admin = requireAdmin(request);
  const { userId, role, jurisdictionIds } = request.data as {
    userId?: string;
    role?: string;
    jurisdictionIds?: string[];
  };
  if (!userId || !VALID_ROLES.includes(role as ManagedRole)) {
    throw new HttpsError('invalid-argument', 'userId and a valid role are required.');
  }
  const managedRole = role as ManagedRole;
  const jurisdictions = Array.isArray(jurisdictionIds)
    ? jurisdictionIds.map((value) => value.trim()).filter(Boolean)
    : [];
  if (jurisdictions.length === 0) {
    throw new HttpsError('invalid-argument', 'At least one jurisdiction is required.');
  }

  const profileRef = db.doc(`users/${userId}`);
  const previousSnap = await profileRef.get();
  const previous = previousSnap.data();
  const wasPending = !previous?.role || previous.status === 'pending';

  const auth = getAuth();
  const user = await auth.getUser(userId);
  await auth.setCustomUserClaims(userId, {
    ...user.customClaims,
    role: managedRole,
    jurisdictionIds: jurisdictions,
  });
  await auth.revokeRefreshTokens(userId);
  await profileRef.set(
    {
      id: userId,
      email: user.email ?? '',
      role: managedRole,
      jurisdictionIds: jurisdictions,
      status: user.disabled ? 'disabled' : 'active',
      disabled: user.disabled === true,
      updatedAt: new Date().toISOString(),
      updatedBy: admin.uid,
      serverUpdatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (wasPending && !user.disabled) {
    try {
      await dispatchNotification({
        type: 'user.approved',
        recipientUids: [userId],
        title: 'Cuenta autorizada',
        body: `Tu rol es ${managedRole}. Ya puedes entrar a EVALQUAKE.`,
        href: '/',
        email: userApprovedEmail({ role: managedRole, jurisdictionIds: jurisdictions }),
        dedupeKey: `user.approved:${userId}:${managedRole}`,
        meta: { userId, role: managedRole },
      });
    } catch (error) {
      logger.error('Failed to notify user of approval', { userId, error });
    }
  }

  return { ok: true };
});

export const setUserDisabled = onCall({ region: 'us-central1' }, async (request) => {
  const admin = requireAdmin(request);
  const { userId, disabled } = request.data as { userId?: string; disabled?: boolean };
  if (!userId || typeof disabled !== 'boolean') {
    throw new HttpsError('invalid-argument', 'userId and disabled are required.');
  }
  if (userId === admin.uid) {
    throw new HttpsError('failed-precondition', 'You cannot disable your own account.');
  }

  const auth = getAuth();
  const user = await auth.updateUser(userId, { disabled });
  if (disabled) await auth.revokeRefreshTokens(userId);
  const role = user.customClaims?.role;
  await db.doc(`users/${userId}`).set(
    {
      id: userId,
      email: user.email ?? '',
      disabled,
      status: disabled ? 'disabled' : role ? 'active' : 'pending',
      updatedAt: new Date().toISOString(),
      updatedBy: admin.uid,
      serverUpdatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { ok: true };
});
