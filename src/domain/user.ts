import type { UserRole } from './evaluation';

export type AccountStatus = 'pending' | 'active' | 'disabled';

export interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole | null;
  jurisdictionIds: string[];
  /** Work groups the account belongs to, mirrored from the custom claims by the server. */
  groupIds: string[];
  status: AccountStatus;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const USER_ROLES: UserRole[] = ['evaluator', 'coordinator', 'admin'];

/** Coordinators also capture field evaluations while keeping the coordination panel. */
export function canAccessEvaluatorWorkspace(role: UserRole | null | undefined) {
  return role === 'evaluator' || role === 'coordinator';
}