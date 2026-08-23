import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeEvaluation, type Evaluation } from '@/domain/evaluation';

const EVALUATIONS_KEY = 'evalquake.evaluations';
const OUTBOX_KEY = 'evalquake.outbox';
const IDB_NAME = 'evalquake-store';
const IDB_STORE = 'kv';
let mutationQueue: Promise<unknown> = Promise.resolve();
let migrated = false;

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IDB_STORE)) {
        request.result.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local store'));
  });
}

async function kvGet(key: string) {
  const db = await openDatabase();
  return new Promise<string | null>((resolve, reject) => {
    const request = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
    request.onsuccess = () => resolve((request.result as string | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Could not read local store'));
  });
}

async function kvSet(key: string, value: string) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(IDB_STORE, 'readwrite');
    transaction.objectStore(IDB_STORE).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not write local store'));
  });
}

async function migrateFromAsyncStorage() {
  if (migrated) return;
  migrated = true;
  if (await kvGet(EVALUATIONS_KEY)) return;
  const legacy = await AsyncStorage.getItem(EVALUATIONS_KEY);
  if (!legacy) return;
  await kvSet(EVALUATIONS_KEY, legacy);
  const outbox = await AsyncStorage.getItem(OUTBOX_KEY);
  if (outbox) await kvSet(OUTBOX_KEY, outbox);
}

export async function listLocalEvaluations(): Promise<Evaluation[]> {
  await migrateFromAsyncStorage();
  const value = await kvGet(EVALUATIONS_KEY);
  const records = value ? (JSON.parse(value) as Evaluation[]) : [];
  return records.map(normalizeEvaluation).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getLocalEvaluation(id: string): Promise<Evaluation | null> {
  const records = await listLocalEvaluations();
  return records.find((record) => record.id === id) ?? null;
}

export async function saveLocalEvaluation(evaluation: Evaluation, queueSync = true) {
  return serialize(async () => {
    await migrateFromAsyncStorage();
    const value = await kvGet(EVALUATIONS_KEY);
    const records = value ? (JSON.parse(value) as Evaluation[]) : [];
    const index = records.findIndex((record) => record.id === evaluation.id);
    if (index >= 0) records[index] = evaluation;
    else records.unshift(evaluation);
    await kvSet(EVALUATIONS_KEY, JSON.stringify(records));

    if (queueSync) {
      const outboxValue = await kvGet(OUTBOX_KEY);
      const outbox = outboxValue ? (JSON.parse(outboxValue) as string[]) : [];
      if (!outbox.includes(evaluation.id)) {
        await kvSet(OUTBOX_KEY, JSON.stringify([...outbox, evaluation.id]));
      }
    }
  });
}

export async function listOutboxIds(): Promise<string[]> {
  await migrateFromAsyncStorage();
  const value = await kvGet(OUTBOX_KEY);
  return value ? (JSON.parse(value) as string[]) : [];
}

export async function removeFromOutbox(id: string) {
  return serialize(async () => {
    await migrateFromAsyncStorage();
    const value = await kvGet(OUTBOX_KEY);
    const outbox = value ? (JSON.parse(value) as string[]) : [];
    await kvSet(OUTBOX_KEY, JSON.stringify(outbox.filter((item) => item !== id)));
  });
}

export async function completeLocalSync(
  id: string,
  expectedUpdatedAt: string,
  remote: Evaluation,
): Promise<boolean> {
  return serialize(async () => {
    await migrateFromAsyncStorage();
    const value = await kvGet(EVALUATIONS_KEY);
    const records = value ? (JSON.parse(value) as Evaluation[]) : [];
    const index = records.findIndex((record) => record.id === id);
    if (index < 0 || records[index]!.updatedAt !== expectedUpdatedAt) return false;
    records[index] = remote;
    await kvSet(EVALUATIONS_KEY, JSON.stringify(records));
    const outboxValue = await kvGet(OUTBOX_KEY);
    const outbox = outboxValue ? (JSON.parse(outboxValue) as string[]) : [];
    await kvSet(OUTBOX_KEY, JSON.stringify(outbox.filter((item) => item !== id)));
    return true;
  });
}

export async function deleteLocalEvaluation(id: string, queueRemoteDelete = true) {
  return serialize(async () => {
    await migrateFromAsyncStorage();
    const value = await kvGet(EVALUATIONS_KEY);
    const records = value ? (JSON.parse(value) as Evaluation[]) : [];
    await kvSet(EVALUATIONS_KEY, JSON.stringify(records.filter((record) => record.id !== id)));

    const outboxValue = await kvGet(OUTBOX_KEY);
    const outbox = outboxValue ? (JSON.parse(outboxValue) as string[]) : [];
    if (queueRemoteDelete) {
      if (!outbox.includes(id)) {
        await kvSet(OUTBOX_KEY, JSON.stringify([...outbox, id]));
      }
      return;
    }
    await kvSet(OUTBOX_KEY, JSON.stringify(outbox.filter((item) => item !== id)));
  });
}
