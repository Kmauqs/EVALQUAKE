import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

import { nameKeyOf, normalizeName } from './workGroupNames';

if (!getApps().length) initializeApp();

const db = getFirestore();

const COLLECTION = 'workGroups';
const MEMBERS_MAX = 200;
const BACKFILL_BATCH = 400;
const BACKFILL_MAX = 5000;

function uniqueUids(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}

type Actor = { uid: string; role: string; email: string };

function requireCoordinator(request: {
  auth?: { uid: string; token: Record<string, unknown> };
}): Actor {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  const role = request.auth.token.role;
  if (role !== 'coordinator' && role !== 'admin') {
    throw new HttpsError('permission-denied', 'Coordinator or administrator role required.');
  }
  return {
    uid: request.auth.uid,
    role: String(role),
    email: String(request.auth.token.email ?? ''),
  };
}

type GroupDoc = {
  name?: string;
  nameKey?: string;
  coordinatorUids?: string[];
  memberUids?: string[];
};

async function loadGroup(groupId: string) {
  const reference = db.doc(`${COLLECTION}/${groupId}`);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Work group not found.');
  return { reference, data: snapshot.data() as GroupDoc };
}

function assertManages(actor: Actor, group: GroupDoc) {
  if (actor.role === 'admin') return;
  if (!(group.coordinatorUids ?? []).includes(actor.uid)) {
    throw new HttpsError('permission-denied', 'You do not coordinate this work group.');
  }
}

/** Members must be accounts already authorized (role assigned) by an administrator. */
async function assertAuthorizedAccounts(uids: string[], requiredRoles?: string[]) {
  if (!uids.length) return;
  const snapshots = await db.getAll(...uids.map((uid) => db.doc(`users/${uid}`)));
  for (const snapshot of snapshots) {
    const data = snapshot.data() as
      | { role?: string | null; status?: string; disabled?: boolean }
      | undefined;
    if (!snapshot.exists || !data?.role || data.disabled === true || data.status !== 'active') {
      throw new HttpsError(
        'failed-precondition',
        `Account ${snapshot.id} is not authorized. The administrator must approve it first.`,
      );
    }
    if (requiredRoles && !requiredRoles.includes(data.role)) {
      throw new HttpsError(
        'failed-precondition',
        `Account ${snapshot.id} cannot coordinate a work group.`,
      );
    }
  }
}

async function groupIdsOf(uid: string) {
  const [asMember, asCoordinator] = await Promise.all([
    db.collection(COLLECTION).where('memberUids', 'array-contains', uid).get(),
    db.collection(COLLECTION).where('coordinatorUids', 'array-contains', uid).get(),
  ]);
  const ids = new Set<string>();
  for (const document of [...asMember.docs, ...asCoordinator.docs]) ids.add(document.id);
  return [...ids];
}

async function retagEvaluations(uid: string, groupIds: string[]) {
  const snapshot = await db
    .collection('evaluations')
    .where('createdByUserId', '==', uid)
    .limit(BACKFILL_MAX)
    .get();
  if (snapshot.empty) return 0;
  let written = 0;
  for (let index = 0; index < snapshot.docs.length; index += BACKFILL_BATCH) {
    const batch = db.batch();
    for (const document of snapshot.docs.slice(index, index + BACKFILL_BATCH)) {
      batch.update(document.ref, { groupIds });
      written += 1;
    }
    await batch.commit();
  }
  return written;
}

/**
 * Recomputes group membership for the given accounts: custom claims (used by the
 * Firestore rules), the mirrored `users/*.groupIds`, and the `groupIds` tag on every
 * evaluation they authored.
 */
async function syncMembership(uids: string[]) {
  const auth = getAuth();
  await Promise.all(
    [...new Set(uids.filter(Boolean))].map(async (uid) => {
      const groupIds = await groupIdsOf(uid);
      try {
        const user = await auth.getUser(uid);
        await auth.setCustomUserClaims(uid, { ...user.customClaims, groupIds });
      } catch (error) {
        logger.warn('Could not update work group claims', { uid, error });
      }
      await db.doc(`users/${uid}`).set(
        {
          groupIds,
          updatedAt: new Date().toISOString(),
          serverUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      const retagged = await retagEvaluations(uid, groupIds);
      logger.info('Work group membership synced', { uid, groupIds, retagged });
    }),
  );
}

export const createWorkGroup = onCall({ region: 'us-central1' }, async (request) => {
  const actor = requireCoordinator(request);
  const { name, memberUids } = request.data as { name?: unknown; memberUids?: unknown };
  const groupName = normalizeName(String(name ?? ''));
  if (!groupName) throw new HttpsError('invalid-argument', 'A work group name is required.');

  const members = uniqueUids(memberUids).slice(0, MEMBERS_MAX);
  await assertAuthorizedAccounts(members);

  const reference = db.collection(COLLECTION).doc();
  const now = new Date().toISOString();
  await db.runTransaction(async (transaction) => {
    const clashes = await transaction.get(
      db.collection(COLLECTION).where('nameKey', '==', nameKeyOf(groupName)).limit(1),
    );
    if (!clashes.empty) {
      throw new HttpsError('already-exists', 'A work group with that name already exists.');
    }
    transaction.set(reference, {
      id: reference.id,
      name: groupName,
      nameKey: nameKeyOf(groupName),
      coordinatorUids: [actor.uid],
      memberUids: members,
      createdByUserId: actor.uid,
      createdByEmail: actor.email,
      createdAt: now,
      updatedAt: now,
      serverUpdatedAt: FieldValue.serverTimestamp(),
    });
  });

  await syncMembership([actor.uid, ...members]);
  return { ok: true, groupId: reference.id };
});

export const updateWorkGroup = onCall({ region: 'us-central1' }, async (request) => {
  const actor = requireCoordinator(request);
  const { groupId, name, memberUids, coordinatorUids } = request.data as {
    groupId?: unknown;
    name?: unknown;
    memberUids?: unknown;
    coordinatorUids?: unknown;
  };
  const id = String(groupId ?? '').trim();
  if (!id) throw new HttpsError('invalid-argument', 'groupId is required.');

  const { reference, data } = await loadGroup(id);
  assertManages(actor, data);

  const patch: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
    serverUpdatedAt: FieldValue.serverTimestamp(),
  };
  const affected = new Set<string>([
    ...(data.memberUids ?? []),
    ...(data.coordinatorUids ?? []),
  ]);

  if (name !== undefined) {
    const groupName = normalizeName(String(name ?? ''));
    if (!groupName) throw new HttpsError('invalid-argument', 'A work group name is required.');
    if (nameKeyOf(groupName) !== data.nameKey) {
      await db.runTransaction(async (transaction) => {
        const clashes = await transaction.get(
          db.collection(COLLECTION).where('nameKey', '==', nameKeyOf(groupName)).limit(1),
        );
        if (clashes.docs.some((document) => document.id !== id)) {
          throw new HttpsError('already-exists', 'A work group with that name already exists.');
        }
        transaction.update(reference, { name: groupName, nameKey: nameKeyOf(groupName) });
      });
    } else {
      patch.name = groupName;
    }
  }

  if (memberUids !== undefined) {
    const members = uniqueUids(memberUids).slice(0, MEMBERS_MAX);
    await assertAuthorizedAccounts(members);
    patch.memberUids = members;
    for (const uid of members) affected.add(uid);
  }

  if (coordinatorUids !== undefined) {
    const coordinators = uniqueUids(coordinatorUids).slice(0, MEMBERS_MAX);
    if (!coordinators.length) {
      throw new HttpsError('invalid-argument', 'A work group needs at least one coordinator.');
    }
    if (actor.role !== 'admin' && !coordinators.includes(actor.uid)) {
      throw new HttpsError('failed-precondition', 'You cannot remove yourself as coordinator.');
    }
    await assertAuthorizedAccounts(coordinators, ['coordinator', 'admin']);
    patch.coordinatorUids = coordinators;
    for (const uid of coordinators) affected.add(uid);
  }

  await reference.set(patch, { merge: true });
  await syncMembership([...affected]);
  return { ok: true };
});

export const deleteWorkGroup = onCall({ region: 'us-central1' }, async (request) => {
  const actor = requireCoordinator(request);
  const id = String((request.data as { groupId?: unknown })?.groupId ?? '').trim();
  if (!id) throw new HttpsError('invalid-argument', 'groupId is required.');

  const { reference, data } = await loadGroup(id);
  assertManages(actor, data);
  const affected = [...(data.memberUids ?? []), ...(data.coordinatorUids ?? [])];
  await reference.delete();
  await syncMembership(affected);
  return { ok: true };
});

/** Author uids a coordinator is allowed to moderate, i.e. members of the groups they manage. */
export async function managedAuthorUids(uid: string) {
  const snapshot = await db
    .collection(COLLECTION)
    .where('coordinatorUids', 'array-contains', uid)
    .get();
  const authors = new Set<string>([uid]);
  for (const document of snapshot.docs) {
    const data = document.data() as GroupDoc;
    for (const member of data.memberUids ?? []) authors.add(member);
    for (const coordinator of data.coordinatorUids ?? []) authors.add(coordinator);
  }
  return authors;
}
