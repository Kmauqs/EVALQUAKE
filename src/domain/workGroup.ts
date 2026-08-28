import { canModerateDelete, type Evaluation, type UserRole } from './evaluation';

export interface WorkGroup {
  id: string;
  name: string;
  /** Accent- and case-insensitive form of `name`, unique across the collection. */
  nameKey: string;
  coordinatorUids: string[];
  memberUids: string[];
  createdByUserId: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export const WORK_GROUP_NAME_MAX_LENGTH = 60;
export const WORK_GROUP_MEMBERS_MAX = 200;

export function normalizeWorkGroupName(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, WORK_GROUP_NAME_MAX_LENGTH);
}

export function workGroupNameKey(value: string) {
  return normalizeWorkGroupName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}

export function asWorkGroup(id: string, data: Record<string, unknown>): WorkGroup {
  const name = typeof data.name === 'string' ? data.name : '';
  const now = new Date().toISOString();
  return {
    id,
    name,
    nameKey: typeof data.nameKey === 'string' && data.nameKey ? data.nameKey : workGroupNameKey(name),
    coordinatorUids: uniqueStrings(data.coordinatorUids),
    memberUids: uniqueStrings(data.memberUids),
    createdByUserId: typeof data.createdByUserId === 'string' ? data.createdByUserId : '',
    createdByEmail: typeof data.createdByEmail === 'string' ? data.createdByEmail : '',
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : now,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : now,
  };
}

export function managesWorkGroup(group: WorkGroup, uid: string) {
  return Boolean(uid) && group.coordinatorUids.includes(uid);
}

export function isWorkGroupMember(group: WorkGroup, uid: string) {
  return Boolean(uid) && group.memberUids.includes(uid);
}

export function belongsToWorkGroup(group: WorkGroup, uid: string) {
  return managesWorkGroup(group, uid) || isWorkGroupMember(group, uid);
}

export function managedWorkGroups(groups: WorkGroup[], uid: string) {
  return groups.filter((group) => managesWorkGroup(group, uid));
}

export function memberWorkGroups(groups: WorkGroup[], uid: string) {
  return groups.filter((group) => belongsToWorkGroup(group, uid));
}

/** Groups the dashboard of `role` is allowed to pivot on. */
export function scopedWorkGroups(groups: WorkGroup[], uid: string, role: UserRole | null) {
  if (role === 'admin') return groups;
  if (role === 'coordinator') return managedWorkGroups(groups, uid);
  return memberWorkGroups(groups, uid);
}

export function workGroupIdsFor(groups: WorkGroup[], uid: string) {
  return memberWorkGroups(groups, uid).map((group) => group.id);
}

export function workGroupNameTaken(groups: WorkGroup[], name: string, exceptId?: string) {
  const key = workGroupNameKey(name);
  if (!key) return false;
  return groups.some((group) => group.nameKey === key && group.id !== exceptId);
}

/**
 * Author uids whose evaluations the given account may see, or `null` for unrestricted
 * (administrators). Own evaluations are always in scope; evaluations authored by users
 * outside every relevant group are not.
 */
export function evaluationAuthorScope(
  groups: WorkGroup[],
  uid: string,
  role: UserRole | null,
): Set<string> | null {
  if (role === 'admin') return null;
  const authors = new Set<string>();
  if (uid) authors.add(uid);
  for (const group of scopedWorkGroups(groups, uid, role)) {
    for (const member of group.memberUids) authors.add(member);
    for (const coordinator of group.coordinatorUids) authors.add(coordinator);
  }
  return authors;
}

export function isEvaluationInScope(evaluation: Evaluation, scope: Set<string> | null) {
  return scope === null || scope.has(evaluation.createdByUserId);
}

/**
 * Coordinators may only moderate evaluations authored inside a group they manage.
 * Mirrors the server-side check in `moderateDeleteEvaluation`.
 */
export function canModerateDeleteInScope(
  evaluation: Evaluation,
  role: UserRole | null,
  uid: string,
  groups: WorkGroup[],
) {
  if (!canModerateDelete(evaluation, role)) return false;
  if (role === 'admin') return true;
  return isEvaluationInScope(evaluation, evaluationAuthorScope(groups, uid, role));
}

export function workGroupLabelsFor(groups: WorkGroup[], evaluation: Evaluation) {
  return groups
    .filter((group) => group.memberUids.includes(evaluation.createdByUserId))
    .map((group) => group.name)
    .sort((left, right) => left.localeCompare(right));
}
