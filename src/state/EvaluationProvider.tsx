import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import {
  canDeleteEvaluation,
  canSaveEvaluation,
  canViewEvaluation,
  createEvaluation,
  isEvaluationOwner,
  isEvaluatorVisible,
  type Evaluation,
} from '@/domain/evaluation';
import { resolveEvaluationJurisdiction } from '@/domain/jurisdiction';
import { subscribeUserEvaluations } from '@/firebase/repository';
import { syncOutbox, type SyncResult } from '@/firebase/sync';
import {
  deleteLocalEvaluation,
  getLocalEvaluation,
  listLocalEvaluations,
  saveLocalEvaluation,
  setLocalStoreUser,
} from '@/services/localStore';

interface EvaluationState {
  evaluations: Evaluation[];
  loading: boolean;
  lastSyncResult: SyncResult | null;
  create: () => Promise<Evaluation>;
  get: (id: string) => Promise<Evaluation | null>;
  save: (evaluation: Evaluation) => Promise<void>;
  share: (id: string, userId: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  retrySync: () => Promise<SyncResult>;
}

const EvaluationContext = createContext<EvaluationState | null>(null);

let writeQueue: Promise<unknown> = Promise.resolve();

function serializeWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function mergeEvaluatorList(remote: Evaluation[], local: Evaluation[], uid: string) {
  const byId = new Map<string, Evaluation>();
  for (const record of remote.filter((item) => isEvaluatorVisible(item, uid))) {
    byId.set(record.id, record);
  }
  for (const record of local.filter((item) => isEvaluatorVisible(item, uid))) {
    const current = byId.get(record.id);
    const keepLocalDraft =
      record.status === 'draft' &&
      (record.syncState === 'local' ||
        record.syncState === 'pending' ||
        record.syncState === 'error' ||
        record.syncState === 'syncing');
    if (!current || (keepLocalDraft && record.updatedAt >= current.updatedAt)) {
      byId.set(record.id, record);
    }
  }
  return [...byId.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function EvaluationProvider({ children }: React.PropsWithChildren) {
  const { uid, user, configured, jurisdictionIds, role, loading: authLoading } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const remoteMineRef = useRef<Evaluation[]>([]);

  const refresh = useCallback(async () => {
    if (configured && authLoading) return;
    await setLocalStoreUser(uid);
    const records = await listLocalEvaluations();
    if (configured && role === 'evaluator') {
      setEvaluations(mergeEvaluatorList(remoteMineRef.current, records, uid));
    } else {
      setEvaluations(
        configured ? records.filter((record) => canViewEvaluation(record, uid, role)) : records,
      );
    }
    setLoading(false);
  }, [authLoading, configured, role, uid]);

  const runSync = useCallback(
    async (options?: { refreshToken?: boolean }) => {
      const result = await syncOutbox({ jurisdictionIds, refreshToken: options?.refreshToken });
      setLastSyncResult(result);
      await refresh();
      return result;
    },
    [jurisdictionIds, refresh],
  );

  useEffect(() => {
    if (configured && authLoading) return;
    const initialize = setTimeout(() => {
      void refresh().then(async () => {
        if (!configured || user) await runSync();
      });
    }, 0);
    const interval = setInterval(() => {
      if (!configured || user) void runSync();
    }, 30_000);
    return () => {
      clearTimeout(initialize);
      clearInterval(interval);
    };
  }, [authLoading, refresh, configured, user, runSync]);

  useEffect(() => {
    if (!configured || !user || role === 'coordinator' || role === 'admin') {
      remoteMineRef.current = [];
      return;
    }
    return subscribeUserEvaluations(user.uid, jurisdictionIds, (remoteRecords) => {
      const visible = remoteRecords.filter((record) => isEvaluatorVisible(record, user.uid));
      remoteMineRef.current = visible;
      void Promise.all(
        visible.map(async (record) => {
          const local = await getLocalEvaluation(record.id);
          if (!local) {
            await saveLocalEvaluation(record, false);
            return;
          }
          if (record.createdByUserId === user.uid) {
            if (
              record.status === 'synced' ||
              record.officialNumber != null ||
              Boolean(record.canonicalPdfStoragePath)
            ) {
              await saveLocalEvaluation(record, false);
            }
            return;
          }
          if (local.status === 'draft' && local.updatedAt >= record.updatedAt) return;
          await saveLocalEvaluation(record, false);
        }),
      ).then(refresh);
    });
  }, [configured, jurisdictionIds, refresh, role, user]);

  const save = useCallback(async (evaluation: Evaluation) => {
    let shouldSync = false;
    await serializeWrite(async () => {
      await setLocalStoreUser(uid);
      const existing = await getLocalEvaluation(evaluation.id);
      if (!canSaveEvaluation(existing, evaluation)) {
        throw new Error('Submitted evaluations are immutable');
      }
      if (existing && !canViewEvaluation(existing, uid, role === 'evaluator' ? 'evaluator' : role)) {
        throw new Error('No tiene acceso a esta evaluación');
      }
      const ownerEmail =
        existing?.createdByEmail ||
        evaluation.createdByEmail ||
        (isEvaluationOwner(existing ?? evaluation, uid) ? user?.email ?? '' : '');
      const next = {
        ...evaluation,
        createdByUserId: existing?.createdByUserId || uid,
        createdByEmail: ownerEmail,
        jurisdictionId: resolveEvaluationJurisdiction(
          jurisdictionIds,
          evaluation.identification,
          evaluation.jurisdictionId,
        ),
        updatedAt: new Date().toISOString(),
      };
      await saveLocalEvaluation(next);
      setEvaluations((records) => {
        const merged = [next, ...records.filter((item) => item.id !== next.id)];
        return role === 'evaluator' ? merged.filter((item) => isEvaluatorVisible(item, uid)) : merged;
      });
      shouldSync = configured && next.status === 'submitted';
    });
    if (shouldSync) void runSync();
  }, [configured, jurisdictionIds, role, runSync, uid, user?.email]);

  const create = useCallback(async () => {
    const next = createEvaluation(
      undefined,
      uid,
      undefined,
      resolveEvaluationJurisdiction(jurisdictionIds),
      user?.email ?? '',
    );
    await save(next);
    return next;
  }, [jurisdictionIds, save, uid, user?.email]);

  const get = useCallback(async (id: string) => {
    await setLocalStoreUser(uid);
    const record = await getLocalEvaluation(id);
    if (!record) return null;
    if (configured && role === 'evaluator' && !isEvaluatorVisible(record, uid)) return null;
    if (configured && !canViewEvaluation(record, uid, role)) return null;
    return record;
  }, [configured, role, uid]);

  const share = useCallback(
    async (id: string, userId: string) => {
      await serializeWrite(async () => {
        await setLocalStoreUser(uid);
        const existing = await getLocalEvaluation(id);
        if (!existing || !isEvaluationOwner(existing, uid)) {
          throw new Error('Solo el evaluador titular puede compartir la inspección');
        }
        if (existing.sharedWithUserIds.includes(userId) || userId === uid) return;
        const next = {
          ...existing,
          sharedWithUserIds: [...existing.sharedWithUserIds, userId],
          syncState: existing.syncState === 'synced' ? ('pending' as const) : existing.syncState,
          updatedAt: new Date().toISOString(),
        };
        await saveLocalEvaluation(next);
        setEvaluations((records) => [next, ...records.filter((item) => item.id !== next.id)]);
      });
      if (configured) void runSync();
    },
    [configured, runSync, uid],
  );

  const remove = useCallback(
    async (id: string) => {
      await serializeWrite(async () => {
        await setLocalStoreUser(uid);
        const existing = await getLocalEvaluation(id);
        if (!existing || !canDeleteEvaluation(existing, uid)) {
          throw new Error('Signed or submitted evaluations cannot be deleted');
        }
        const queueRemote = configured && existing.syncState !== 'local';
        await deleteLocalEvaluation(id, queueRemote);
        setEvaluations((records) => records.filter((item) => item.id !== id));
      });
      if (configured) void runSync();
    },
    [configured, runSync, uid],
  );

  const retrySync = useCallback(async () => runSync({ refreshToken: true }), [runSync]);

  const value = useMemo(
    () => ({ evaluations, loading, lastSyncResult, create, get, save, share, remove, refresh, retrySync }),
    [evaluations, loading, lastSyncResult, create, get, save, share, remove, refresh, retrySync],
  );

  return <EvaluationContext.Provider value={value}>{children}</EvaluationContext.Provider>;
}

export function useEvaluations() {
  const value = useContext(EvaluationContext);
  if (!value) throw new Error('useEvaluations must be used inside EvaluationProvider');
  return value;
}
