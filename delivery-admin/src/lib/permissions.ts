import { rolePermissions } from "@/constants/roles";
import type { AdminRole, Permission } from "@/types";

export function getPermissionsForRole(role: AdminRole) {
  return rolePermissions[role];
}

export function hasPermission(permissions: Permission[], permission: Permission) {
  return permissions.includes(permission);
}
