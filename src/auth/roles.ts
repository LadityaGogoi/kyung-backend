import { UserRole } from '@prisma/client';

export const RoleGroups = {
  STAFF:            [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.MASTER_ADMIN, UserRole.DEVELOPER, UserRole.TESTER],
  CAN_DIRECT_EDIT:  [UserRole.ADMIN, UserRole.MASTER_ADMIN],
  CAN_APPROVE:      [UserRole.ADMIN, UserRole.MASTER_ADMIN],
  CAN_ASSIGN_ROLE:  [UserRole.MASTER_ADMIN],
  PROTECTED_ROLES:  [UserRole.EMPLOYEE, UserRole.ADMIN, UserRole.MASTER_ADMIN],
} as const;

export function can(role: UserRole, group: keyof typeof RoleGroups): boolean {
  return (RoleGroups[group] as readonly UserRole[]).includes(role);
}
