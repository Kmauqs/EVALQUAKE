import * as SQLite from 'expo-sqlite';

import { normalizeEvaluation, type Evaluation } from '@/domain/evaluation';

let databasePromise: Promise<SQLite.SQLiteDatabase> | undefined;

async function database() {
  databasePromise ??= SQLite.openDatabaseAsync('evalquake.db').then(async (db) => {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS evaluations (
        id TEXT PRIMARY KEY NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS outbox (
        evaluation_id TEXT PRIMARY KEY NOT NULL,
        operation TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `);
    return db;
  });
  return databasePromise;
}

export async function listLocalEvaluations(): Promise<Evaluation[]> {
  const db = await database();
  const rows = await db.getAllAsync<{ payload: string }>(
    'SELECT payload FROM evaluations ORDER BY updated_at DESC',
  );
  return rows.map((row) => normalizeEvaluation(JSON.parse(row.payload) as Evaluation));
}

export async function getLocalEvaluation(id: string): Promise<Evaluation | null> {
  const db = await database();
  const row = await db.getFirstAsync<{ payload: string }>(
    'SELECT payload FROM evaluations WHERE id = ?',
    id,
  );
  return row ? normalizeEvaluation(JSON.parse(row.payload) as Evaluation) : null;
}

export async function saveLocalEvaluation(evaluation: Evaluation, queueSync = true) {
  const db = await database();
  await db.runAsync(
    `INSERT INTO evaluations (id, payload, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    evaluation.id,
    JSON.stringify(evaluation),
    evaluation.updatedAt,
  );
  if (queueSync) {
    await db.runAsync(
      `INSERT INTO outbox (evaluation_id, operation, created_at) VALUES (?, 'upsert', ?)
       ON CONFLICT(evaluation_id) DO UPDATE SET operation = 'upsert'`,
      evaluation.id,
      new Date().toISOString(),
    );
  }
}

export async function listOutboxIds(): Promise<string[]> {
  const db = await database();
  const rows = await db.getAllAsync<{ evaluation_id: string }>('SELECT evaluation_id FROM outbox');
  return rows.map((row) => row.evaluation_id);
}

export async function removeFromOutbox(id: string) {
  const db = await database();
  await db.runAsync('DELETE FROM outbox WHERE evaluation_id = ?', id);
}

export async function completeLocalSync(
  id: string,
  expectedUpdatedAt: string,
  remote: Evaluation,
): Promise<boolean> {
  const db = await database();
  let completed = false;
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const result = await transaction.runAsync(
      `UPDATE evaluations SET payload = ?, updated_at = ?
       WHERE id = ? AND updated_at = ?`,
      JSON.stringify(remote),
      remote.updatedAt,
      id,
      expectedUpdatedAt,
    );
    if (result.changes === 1) {
      await transaction.runAsync('DELETE FROM outbox WHERE evaluation_id = ?', id);
      completed = true;
    }
  });
  return completed;
}

export async function deleteLocalEvaluation(id: string, queueRemoteDelete = true) {
  const db = await database();
  await db.runAsync('DELETE FROM evaluations WHERE id = ?', id);
  if (queueRemoteDelete) {
    await db.runAsync(
      `INSERT INTO outbox (evaluation_id, operation, created_at) VALUES (?, 'delete', ?)
       ON CONFLICT(evaluation_id) DO UPDATE SET operation = 'delete'`,
      id,
      new Date().toISOString(),
    );
    return;
  }
  await db.runAsync('DELETE FROM outbox WHERE evaluation_id = ?', id);
}
