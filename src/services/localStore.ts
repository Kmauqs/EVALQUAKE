import { Platform } from 'react-native';

import type { Evaluation } from '@/domain/evaluation';

const implementation = () =>
  Platform.OS === 'web' ? import('./localStore.web') : import('./localStore.native');

export async function listLocalEvaluations(): Promise<Evaluation[]> {
  return (await implementation()).listLocalEvaluations();
}

export async function getLocalEvaluation(id: string): Promise<Evaluation | null> {
  return (await implementation()).getLocalEvaluation(id);
}

export async function saveLocalEvaluation(evaluation: Evaluation, queueSync = true) {
  return (await implementation()).saveLocalEvaluation(evaluation, queueSync);
}

export async function listOutboxIds(): Promise<string[]> {
  return (await implementation()).listOutboxIds();
}

export async function removeFromOutbox(id: string) {
  return (await implementation()).removeFromOutbox(id);
}

export async function completeLocalSync(
  id: string,
  expectedUpdatedAt: string,
  remote: Evaluation,
): Promise<boolean> {
  return (await implementation()).completeLocalSync(id, expectedUpdatedAt, remote);
}

export async function deleteLocalEvaluation(id: string, queueRemoteDelete = true) {
  return (await implementation()).deleteLocalEvaluation(id, queueRemoteDelete);
}
