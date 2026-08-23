import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeEvaluation, isEvaluatorVisible, type Evaluation } from '@/domain/evaluation';

const LEGACY_EVALUATIONS_KEY = 'evalquake.evaluations';
const LEGACY_OUTBOX_KEY = 'evalquake.outbox';
const IDB_NAME = 'evalquake-store';
const IDB_STORE = 'kv';
let mutationQueue: Promise<unknown> = Promise.resolve();
let migrated = false;
let activeUserId = 'signed-out';
const migratedScopes = new Set<string>();

export function setLocalStoreUser(uid: string) {
  activeUserId = uid.trim() || 'signed-out';
}

function evaluationsKey() {
  return `evalquake.evaluations.${activeUserId}`;
}

function outboxKey() {
  return `evalquake.outbox.${activeUserId}`;
}

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
  if (await kvGet(LEGACY_EVALUATIONS_KEY)) return;
  const legacy = await AsyncStorage.getItem(LEGACY_EVALUATIONS_KEY);
  if (!legacy) return;
  await kvSet(LEGACY_EVALUATIONS_KEY, legacy);
  const outbox = await AsyncStorage.getItem(LEGACY_OUTBOX_KEY);
  if (outbox) await kvSet(LEGACY_OUTBOX_KEY, outbox);
}

async function migrateLegacyScope() {
  await migrateFromAsyncStorage();
  if (migratedScopes.has(activeUserId)) return;
  migratedScopes.add(activeUserId);
  if (await kvGet(evaluationsKey()) != null) return;
  if (activeUserId === 'signed-out') {
    await kvSet(evaluationsKey(), '[]');
    await kvSet(outboxKey(), '[]');
    return;
  }
  const legacy = await kvGet(LEGACY_EVALUATIONS_KEY);
  const records = legacy ? (JSON.parse(legacy) as Evaluation[]) : [];
  const visible = records
    .map((item) => normalizeEvaluation(item))
    .filter((item) => isEvaluatorVisible(item, activeUserId));
  await kvSet(evaluationsKey(), JSON.stringify(visible));
  const legacyOutbox = await kvGet(LEGACY_OUTBOX_KEY);
  const outbox = legacyOutbox ? (JSON.parse(legacyOutbox) as string[]) : [];
  const visibleIds = new Set(visible.map((item) => item.id));
  await kvSet(outboxKey(), JSON.stringify(outbox.filter((id) => visibleIds.has(id))));
}

export async function listLocalEvaluations(): Promise<Evaluation[]> {
  await migrateLegacyScope();
  const value = await kvGet(evaluationsKey());
  const records = value ? (JSON.parse(value) as Evaluation[]) : [];
  return records.map(normalizeEvaluation).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getLocalEvaluation(id: string): Promise<Evaluation | null> {
  const records = await listLocalEvaluations();
  return records.find((record) => record.id === id) ?? null;
}

export async function saveLocalEvaluation(evaluation: Evaluation, queueSync = true) {
  return serialize(async () => {
    await migrateLegacyScope();
    const value = await kvGet(evaluationsKey());
    const records = value ? (JSON.parse(value) as Evaluation[]) : [];
    const index = records.findIndex((record) => record.id === evaluation.id);
    if (index >= 0) records[index] = evaluation;
    else records.unshift(evaluation);
    await kvSet(evaluationsKey(), JSON.stringify(records));

    if (queueSync) {
      const outboxValue = await kvGet(outboxKey());
      const outbox = outboxValue ? (JSON.parse(outboxValue) as string[]) : [];
      if (!outbox.includes(evaluation.id)) {
        await kvSet(outboxKey(), JSON.stringify([...outbox, evaluation.id]));
      }
    }
  });
}

export async function addToOutbox(id: string) {
  return serialize(async () => {
    await migrateLegacyScope();
    const value = await kvGet(outboxKey());
    const outbox = value ? (JSON.parse(value) as string[]) : [];
    if (!outbox.includes(id)) {
      await kvSet(outboxKey(), JSON.stringify([...outbox, id]));
    }
  });
}

export async function listOutboxIds(): Promise<string[]> {
  return serialize(async () => {
    await migrateLegacyScope();
    const value = await kvGet(outboxKey());
    return value ? (JSON.parse(value) as string[]) : [];
  });
}

export async function removeFromOutbox(id: string) {
  return serialize(async () => {
    await migrateLegacyScope();
    const value = await kvGet(outboxKey());
    const outbox = value ? (JSON.parse(value) as string[]) : [];
    await kvSet(outboxKey(), JSON.stringify(outbox.filter((item) => item !== id)));
  });
}

export async function completeLocalSync(
  id: string,
  expectedUpdatedAt: string,
  remote: Evaluation,
): Promise<boolean> {
  return serialize(async () => {
    await migrateLegacyScope();
    const value = await kvGet(evaluationsKey());
    const records = value ? (JSON.parse(value) as Evaluation[]) : [];
    const index = records.findIndex((record) => record.id === id);
    if (index < 0) return false;
    const local = records[index]!;
    if (local.updatedAt !== expectedUpdatedAt && local.status === 'draft') return false;
    records[index] = {
      ...local,
      ...remote,
      photos: local.photos.length ? local.photos : remote.photos,
      sketchUri: local.sketchUri || remote.sketchUri,
      signatureUri: local.signatureUri || remote.signatureUri,
    };
    await kvSet(evaluationsKey(), JSON.stringify(records));
    const outboxValue = await kvGet(outboxKey());
    const outbox = outboxValue ? (JSON.parse(outboxValue) as string[]) : [];
    await kvSet(outboxKey(), JSON.stringify(outbox.filter((item) => item !== id)));
    return true;
  });
}

export async function deleteLocalEvaluation(id: string, queueRemoteDelete = true) {
  return serialize(async () => {
    await migrateLegacyScope();
    const value = await kvGet(evaluationsKey());
    const records = value ? (JSON.parse(value) as Evaluation[]) : [];
    await kvSet(evaluationsKey(), JSON.stringify(records.filter((record) => record.id !== id)));

    const outboxValue = await kvGet(outboxKey());
    const outbox = outboxValue ? (JSON.parse(outboxValue) as string[]) : [];
    if (queueRemoteDelete) {
      if (!outbox.includes(id)) {
        await kvSet(outboxKey(), JSON.stringify([...outbox, id]));
      }
      return;
    }
    await kvSet(outboxKey(), JSON.stringify(outbox.filter((item) => item !== id)));
  });
}
