import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type DocumentData } from 'firebase-admin/firestore';

if (!getApps().length) initializeApp();

const db = getFirestore();

function isActiveAccount(data: DocumentData | undefined) {
  if (!data) return false;
  if (data.disabled === true) return false;
  if (data.status === 'disabled') return false;
  return data.status === 'active' || data.role === 'admin' || data.role === 'coordinator';
}

function hasJurisdictionAccess(data: DocumentData, jurisdictionId: string) {
  const ids = Array.isArray(data.jurisdictionIds)
    ? data.jurisdictionIds.filter((value): value is string => typeof value === 'string')
    : [];
  const needle = jurisdictionId.trim().toLowerCase();
  return ids.some((id) => {
    const normalized = id.trim().toLowerCase();
    return normalized === needle || normalized === 'nacional';
  });
}

/** Active administrator user ids. */
export async function listAdminUids(): Promise<string[]> {
  const snapshot = await db.collection('users').where('role', '==', 'admin').get();
  return snapshot.docs.filter((doc) => isActiveAccount(doc.data())).map((doc) => doc.id);
}

/**
 * Admins (all) plus coordinators with access to the evaluation jurisdiction
 * (including those with Nacional scope).
 */
export async function listAdminsAndCoordinatorsFor(jurisdictionId: string): Promise<string[]> {
  const [admins, coordinators] = await Promise.all([
    listAdminUids(),
    db.collection('users').where('role', '==', 'coordinator').get(),
  ]);
  const coordinatorUids = coordinators.docs
    .filter((doc) => {
      const data = doc.data();
      return isActiveAccount(data) && hasJurisdictionAccess(data, jurisdictionId);
    })
    .map((doc) => doc.id);
  return [...new Set([...admins, ...coordinatorUids])];
}

export async function resolveRecipientEmails(uids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(uids.filter(Boolean))];
  const emails = new Map<string, string>();
  await Promise.all(
    unique.map(async (uid) => {
      const snap = await db.doc(`users/${uid}`).get();
      const email = String(snap.data()?.email ?? '').trim();
      if (email.includes('@')) emails.set(uid, email);
    }),
  );
  return emails;
}
