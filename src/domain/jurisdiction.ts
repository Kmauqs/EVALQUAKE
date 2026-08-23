export const DEMO_JURISDICTION_ID = 'jurisdiction-demo';
export const NATIONAL_JURISDICTION_ID = 'Nacional';

export function normalizeJurisdictionKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function hasNationalScope(jurisdictionIds: string[]) {
  return jurisdictionIds.some(
    (id) => normalizeJurisdictionKey(id) === normalizeJurisdictionKey(NATIONAL_JURISDICTION_ID),
  );
}

export function canonicalJurisdiction(allowed: string[], candidate?: string) {
  if (!candidate?.trim()) return undefined;
  const key = normalizeJurisdictionKey(candidate);
  return allowed.find((id) => normalizeJurisdictionKey(id) === key);
}

export function resolveEvaluationJurisdiction(
  allowed: string[],
  identification?: { municipality?: string; department?: string },
  current?: string,
) {
  const municipality = canonicalJurisdiction(allowed, identification?.municipality);
  if (municipality) return municipality;
  const department = canonicalJurisdiction(allowed, identification?.department);
  if (department) return department;

  const currentAllowed = canonicalJurisdiction(allowed, current);
  if (
    currentAllowed &&
    normalizeJurisdictionKey(currentAllowed) !== normalizeJurisdictionKey(DEMO_JURISDICTION_ID)
  ) {
    return currentAllowed;
  }

  const national = allowed.find(
    (id) => normalizeJurisdictionKey(id) === normalizeJurisdictionKey(NATIONAL_JURISDICTION_ID),
  );
  if (national) return national;

  const firstReal = allowed.find(
    (id) => normalizeJurisdictionKey(id) !== normalizeJurisdictionKey(DEMO_JURISDICTION_ID),
  );
  if (firstReal) return firstReal;

  return current?.trim() || DEMO_JURISDICTION_ID;
}
