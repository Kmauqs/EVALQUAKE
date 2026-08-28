export const WORK_GROUP_NAME_MAX_LENGTH = 60;

/** Kept in sync with `normalizeWorkGroupName` / `workGroupNameKey` in src/domain/workGroup.ts. */
export function normalizeName(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, WORK_GROUP_NAME_MAX_LENGTH);
}

export function nameKeyOf(value: string) {
  return normalizeName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
