import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/auth/AuthProvider';
import { canSaveEvaluation, createEvaluation, type Evaluation } from '@/domain/evaluation';
import { subscribeUserEvaluations } from '@/firebase/repository';
import { syncOutbox } from '@/firebase/sync';
import {
  getLocalEvaluation,
  listLocalEvaluations,
  saveLocalEvaluation,
} from '@/services/localStore';

interface EvaluationState {
  evaluations: Evaluation[];
  loading: boolean;
  create: () => Promise<Evaluation>;
  get: (id: string) => Promise<Evaluation | null>;
  save: (evaluation: Evaluation) => Promise<void>;
  refresh: () => Promise<void>;
}

const EvaluationContext = createContext<EvaluationState | null>(null);

export function EvaluationProvider({ children }: React.PropsWithChildren) {
  const { uid, user, configured, jurisdictionIds } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const records = await listLocalEvaluations();
    setEvaluations(
      configured ? records.filter((record) => record.createdByUserId === uid) : records,
    );
    setLoading(false);
  }, [configured, uid]);

  useEffect(() => {
    const initialize = setTimeout(() => {
      void refresh().then(async () => {
        if (!configured || user) await syncOutbox();
        await refresh();
      });
    }, 0);
    const interval = setInterval(() => {
      if (!configured || user) void syncOutbox().then(refresh);
    }, 30_000);
    return () => {
      clearTimeout(initialize);
      clearInterval(interval);
    };
  }, [refresh, configured, user]);

  useEffect(() => {
    if (!configured || !user) return;
    return subscribeUserEvaluations(user.uid, jurisdictionIds, (remoteRecords) => {
      void Promise.all(
        remoteRecords
          .filter(
            (record) =>
              record.status === 'synced' ||
              record.officialNumber != null ||
              Boolean(record.canonicalPdfStoragePath),
          )
          .map((record) => saveLocalEvaluation(record, false)),
      ).then(refresh);
    });
  }, [configured, jurisdictionIds, refresh, user]);

  const save = useCallback(async (evaluation: Evaluation) => {
    const existing = await getLocalEvaluation(evaluation.id);
    if (!canSaveEvaluation(existing, evaluation)) {
      throw new Error('Submitted evaluations are immutable');
    }
    const next = { ...evaluation, updatedAt: new Date().toISOString() };
    await saveLocalEvaluation(next);
    setEvaluations((records) => [next, ...records.filter((item) => item.id !== next.id)]);
  }, []);

  const create = useCallback(async () => {
    const next = createEvaluation(undefined, uid);
    await save(next);
    return next;
  }, [save, uid]);

  const get = useCallback(async (id: string) => getLocalEvaluation(id), []);

  const value = useMemo(
    () => ({ evaluations, loading, create, get, save, refresh }),
    [evaluations, loading, create, get, save, refresh],
  );

  return <EvaluationContext.Provider value={value}>{children}</EvaluationContext.Provider>;
}

export function useEvaluations() {
  const value = useContext(EvaluationContext);
  if (!value) throw new Error('useEvaluations must be used inside EvaluationProvider');
  return value;
}
