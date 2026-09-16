import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { getFirebaseServices } from './client';

export interface ActionLog {
  id: string;
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
}

export async function moderateDeleteEvaluation(evaluationId: string) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured');
  await httpsCallable(services.functions, 'moderateDeleteEvaluation')({ evaluationId });
}

export function subscribeActionLogs(
  onChange: (logs: ActionLog[]) => void,
  onError?: (error: Error) => void,
) {
  const services = getFirebaseServices();
  if (!services) {
    onChange([]);
    return () => undefined;
  }
  return onSnapshot(
    query(collection(services.db, 'actionLogs'), orderBy('at', 'desc'), limit(300)),
    (snapshot) =>
      onChange(
        snapshot.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id,
            at: typeof data.at === 'string' ? data.at : item.id,
            actorUid: String(data.actorUid ?? ''),
            actorEmail: String(data.actorEmail ?? ''),
            actorRole: String(data.actorRole ?? ''),
            action: String(data.action ?? ''),
            evaluationId: String(data.evaluationId ?? ''),
            evaluationStatus: String(data.evaluationStatus ?? ''),
            officialNumber: typeof data.officialNumber === 'number' ? data.officialNumber : null,
            ownerUid: String(data.ownerUid ?? ''),
            ownerEmail: String(data.ownerEmail ?? ''),
            address: String(data.address ?? ''),
            neighborhood: String(data.neighborhood ?? ''),
            purpose: String(data.purpose ?? ''),
          };
        }),
      ),
    (error) => onError?.(error),
  );
}
