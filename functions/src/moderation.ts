import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

if (!getApps().length) initializeApp();

const db = getFirestore();

export type ActionLog = {
  at: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  evaluationId: string;
  evaluationStatus: string;
  officialNumber: number | null;
  ownerUid: string;
  ownerEmail: string;
  address: string;
  neighborhood: string;
  purpose: string;
};

function requireModerator(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  const role = request.auth.token.role;
  if (role !== 'coordinator' && role !== 'admin') {
    throw new HttpsError('permission-denied', 'Coordinator or administrator role required.');
  }
  return { uid: request.auth.uid, role: String(role), email: String(request.auth.token.email ?? '') };
}

export const moderateDeleteEvaluation = onCall({ region: 'us-central1' }, async (request) => {
  const actor = requireModerator(request);
  const evaluationId = String((request.data as { evaluationId?: unknown })?.evaluationId ?? '').trim();
  if (!evaluationId) throw new HttpsError('invalid-argument', 'evaluationId is required.');

  const reference = db.doc(`evaluations/${evaluationId}`);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'Evaluation not found.');
  const evaluation = snapshot.data() as {
    status?: string;
    officialNumber?: number | null;
    canonicalPdfStoragePath?: string;
    createdByUserId?: string;
    createdByEmail?: string;
    building?: { address?: string };
    identification?: { neighborhood?: string };
  };

  const isDraft =
    evaluation.status === 'draft' &&
    evaluation.officialNumber == null &&
    !evaluation.canonicalPdfStoragePath;
  if (actor.role === 'coordinator' && !isDraft) {
    throw new HttpsError(
      'permission-denied',
      'Coordinators can only delete unused drafts. Submitted evaluations require an administrator.',
    );
  }

  const log: ActionLog = {
    at: new Date().toISOString(),
    actorUid: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'delete_evaluation',
    evaluationId,
    evaluationStatus: evaluation.status ?? '',
    officialNumber: evaluation.officialNumber ?? null,
    ownerUid: evaluation.createdByUserId ?? '',
    ownerEmail: evaluation.createdByEmail ?? '',
    address: evaluation.building?.address ?? '',
    neighborhood: evaluation.identification?.neighborhood ?? '',
    purpose: isDraft ? 'debug_unused_drafts' : 'admin_purge_submitted',
  };
  await db.collection('actionLogs').add({
    ...log,
    serverCreatedAt: FieldValue.serverTimestamp(),
  });
  await reference.delete();
  return { ok: true, log };
});
