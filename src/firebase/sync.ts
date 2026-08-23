import { resolveEvaluationJurisdiction } from '@/domain/jurisdiction';
import {
  addToOutbox,
  completeLocalSync,
  getLocalEvaluation,
  listLocalEvaluations,
  listOutboxIds,
  removeFromOutbox,
  setLocalStoreUser,
} from '@/services/localStore';
import { isEvaluationOwner, isSupportingInspector, needsRemoteSync, type Evaluation } from '@/domain/evaluation';
import { firebaseConfigured, getFirebaseServices } from './client';
import { deleteRemoteEvaluation, pushEvaluation } from './repository';

export type SyncResult = {
  synced: number;
  failed: number;
  pending: number;
  errors: string[];
};

export function isSyncFailure(result: SyncResult) {
  return result.failed > 0 || result.errors.length > 0 || (result.synced === 0 && result.pending > 0);
}

let syncing = false;

function emptyResult(errors: string[] = []): SyncResult {
  return { synced: 0, failed: 0, pending: 0, errors };
}

function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) {
    const code = 'code' in error && error.code ? `${String(error.code)}: ` : '';
    return `${code}${String((error as { message: unknown }).message)}`;
  }
  return String(error);
}

function claimJurisdictions(claims: Record<string, unknown>) {
  return Array.isArray(claims.jurisdictionIds)
    ? claims.jurisdictionIds.filter((value): value is string => typeof value === 'string')
    : [];
}

function canSyncEvaluation(record: Evaluation, uid: string, email?: string | null) {
  if (isEvaluationOwner(record, uid) || isSupportingInspector(record, uid)) return true;
  if (record.createdByUserId && record.createdByUserId !== 'demo-evaluator') return false;
  const ownerEmail = record.createdByEmail.trim().toLowerCase();
  const mine = email?.trim().toLowerCase();
  if (ownerEmail && mine && ownerEmail !== mine) return false;
  return !record.createdByUserId || record.createdByUserId === 'demo-evaluator';
}

function isPermissionDenied(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      String((error as { code: unknown }).code).includes('permission-denied'),
  );
}

async function waitIfBusy() {
  const started = Date.now();
  while (syncing) {
    if (Date.now() - started > 90_000) {
      throw new Error('Otra sincronización sigue en curso. Espere un momento y reintente.');
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

export async function syncOutbox(options?: {
  jurisdictionIds?: string[];
  refreshToken?: boolean;
}): Promise<SyncResult> {
  if (!firebaseConfigured) return emptyResult(['Firebase no está configurado en este build.']);
  const currentUser = getFirebaseServices()?.auth.currentUser;
  if (!currentUser) return emptyResult(['No hay sesión para sincronizar.']);
  await setLocalStoreUser(currentUser.uid);

  await waitIfBusy();
  syncing = true;
  const errors: string[] = [];
  let synced = 0;
  let failed = 0;
  try {
    const leftovers = (await listLocalEvaluations()).filter(
      (record) => canSyncEvaluation(record, currentUser.uid, currentUser.email) && needsRemoteSync(record),
    );
    await Promise.all(leftovers.map((record) => addToOutbox(record.id)));

    const token = await currentUser.getIdTokenResult(options?.refreshToken === true);
    const allowed = Array.from(
      new Set([...claimJurisdictions(token.claims), ...(options?.jurisdictionIds ?? [])]),
    );
    if (allowed.length === 0) {
      return {
        synced: 0,
        failed: leftovers.length || 1,
        pending: leftovers.length,
        errors: [
          'La cuenta no tiene jurisdicciones en el token. Un administrador debe asignarlas y el usuario debe pulsar Comprobar acceso.',
        ],
      };
    }

    const queued = await listOutboxIds();
    if (leftovers.length > 0 && queued.length === 0) {
      errors.push(
        'Las evaluaciones pendientes no entraron en la cola local. Recargue la página e intente de nuevo.',
      );
      failed += leftovers.length;
    }

    for (const id of queued) {
      const local = await getLocalEvaluation(id);
      if (!local) {
        try {
          await deleteRemoteEvaluation(id);
          await removeFromOutbox(id);
          synced += 1;
        } catch (error) {
          if (isPermissionDenied(error)) {
            await removeFromOutbox(id);
            synced += 1;
          } else {
            errors.push(errorMessage(error));
            failed += 1;
          }
        }
        continue;
      }
      if (!canSyncEvaluation(local, currentUser.uid, currentUser.email)) {
        await removeFromOutbox(id);
        continue;
      }
      try {
        const remote = await pushEvaluation({
          ...local,
          createdByUserId:
            canSyncEvaluation(local, currentUser.uid, currentUser.email) &&
            (isEvaluationOwner(local, currentUser.uid) ||
              local.createdByUserId === 'demo-evaluator' ||
              !local.createdByUserId)
              ? currentUser.uid
              : local.createdByUserId,
          jurisdictionId: resolveEvaluationJurisdiction(
            allowed,
            local.identification,
            local.jurisdictionId,
          ),
          syncState: 'syncing',
        });
        const completed = await completeLocalSync(id, local.updatedAt, remote);
        if (completed) synced += 1;
        else {
          failed += 1;
          errors.push(`No se pudo confirmar en el dispositivo la subida de ${id}.`);
        }
      } catch (error) {
        const message = errorMessage(error);
        console.error(`EVALQUAKE sync failed for ${id}`, error);
        errors.push(`${id}: ${message}`);
        failed += 1;
      }
    }
  } finally {
    syncing = false;
  }

  const pending = (await listLocalEvaluations()).filter(
    (record) => canSyncEvaluation(record, currentUser.uid, currentUser.email) && needsRemoteSync(record),
  ).length;
  return { synced, failed, pending, errors };
}
