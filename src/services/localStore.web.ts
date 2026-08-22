import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeEvaluation, type Evaluation } from '@/domain/evaluation';

const EVALUATIONS_KEY = 'evalquake.evaluations';
const OUTBOX_KEY = 'evalquake.outbox';
let mutationQueue: Promise<unknown> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function listLocalEvaluations(): Promise<Evaluation[]> {
  const value = await AsyncStorage.getItem(EVALUATIONS_KEY);
  const records = value ? (JSON.parse(value) as Evaluation[]) : [];
  return records.map(normalizeEvaluation).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getLocalEvaluation(id: string): Promise<Evaluation | null> {
  const records = await listLocalEvaluations();
  return records.find((record) => record.id === id) ?? null;
}

export async function saveLocalEvaluation(evaluation: Evaluation, queueSync = true) {
  return serialize(async () => {
    const value = await AsyncStorage.getItem(EVALUATIONS_KEY);
    const records = value ? (JSON.parse(value) as Evaluation[]) : [];
    const index = records.findIndex((record) => record.id === evaluation.id);
    if (index >= 0) records[index] = evaluation;
    else records.unshift(evaluation);
    await AsyncStorage.setItem(EVALUATIONS_KEY, JSON.stringify(records));

    if (queueSync) {
      const outboxValue = await AsyncStorage.getItem(OUTBOX_KEY);
      const outbox = outboxValue ? (JSON.parse(outboxValue) as string[]) : [];
      if (!outbox.includes(evaluation.id)) {
        await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify([...outbox, evaluation.id]));
      }
    }
  });
}

export async function listOutboxIds(): Promise<string[]> {
  const value = await AsyncStorage.getItem(OUTBOX_KEY);
  return value ? (JSON.parse(value) as string[]) : [];
}

export async function removeFromOutbox(id: string) {
  return serialize(async () => {
    const value = await AsyncStorage.getItem(OUTBOX_KEY);
    const outbox = value ? (JSON.parse(value) as string[]) : [];
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox.filter((item) => item !== id)));
  });
}

export async function completeLocalSync(
  id: string,
  expectedUpdatedAt: string,
  remote: Evaluation,
): Promise<boolean> {
  return serialize(async () => {
    const value = await AsyncStorage.getItem(EVALUATIONS_KEY);
    const records = value ? (JSON.parse(value) as Evaluation[]) : [];
    const index = records.findIndex((record) => record.id === id);
    if (index < 0 || records[index]!.updatedAt !== expectedUpdatedAt) return false;
    records[index] = remote;
    await AsyncStorage.setItem(EVALUATIONS_KEY, JSON.stringify(records));
    const outboxValue = await AsyncStorage.getItem(OUTBOX_KEY);
    const outbox = outboxValue ? (JSON.parse(outboxValue) as string[]) : [];
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox.filter((item) => item !== id)));
    return true;
  });
}

export async function deleteLocalEvaluation(id: string, queueRemoteDelete = true) {
  return serialize(async () => {
    const value = await AsyncStorage.getItem(EVALUATIONS_KEY);
    const records = value ? (JSON.parse(value) as Evaluation[]) : [];
    await AsyncStorage.setItem(
      EVALUATIONS_KEY,
      JSON.stringify(records.filter((record) => record.id !== id)),
    );

    const outboxValue = await AsyncStorage.getItem(OUTBOX_KEY);
    const outbox = outboxValue ? (JSON.parse(outboxValue) as string[]) : [];
    if (queueRemoteDelete) {
      if (!outbox.includes(id)) {
        await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify([...outbox, id]));
      }
      return;
    }
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox.filter((item) => item !== id)));
  });
}
