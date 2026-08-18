import type { UserRole } from './evaluation';

export type AccountStatus = 'pending' | 'active' | 'disabled';

export interface AppUser {
  id: string;
  email: string;
  displayName?: string;
  role: UserRole | null;
  jurisdictionIds: string[];
  status: AccountStatus;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const USER_ROLES: UserRole[] = ['evaluator', 'coordinator', 'admin'];
