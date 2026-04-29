import { create } from "zustand";

import { rolePermissions } from "@/constants/roles";
import {
  clearAdminAuthSession,
  consumeRedirectSession,
  readAdminAuthSession,
  writeAdminAuthSession,
  type AdminAuthSession
} from "@/lib/auth-storage";
import type { AdminRole, AdminUser, Permission } from "@/types";

interface AuthState {
  token: string | null;
  expiresAt?: string;
  currentUser: AdminUser | null;
  hydrated: boolean;
  bootstrapSession: () => void;
  setSession: (session: AdminAuthSession) => boolean;
  clearSession: () => void;
  hasPermission: (permission: Permission) => boolean;
}

function resolveAdminRole(role: string): AdminRole | null {
  if (role === "admin") {
    return "super_admin";
  }

  if (
    role === "super_admin" ||
    role === "operations_manager" ||
    role === "dispatcher" ||
    role === "support_agent" ||
    role === "finance_admin" ||
    role === "store_success_manager"
  ) {
    return role;
  }

  return null;
}

function mapSessionUser(session: AdminAuthSession): AdminUser | null {
  const role = resolveAdminRole(session.user.role);

  if (!role) {
    return null;
  }

  const createdAt = session.user.createdAt ?? session.user.created_at;
  const updatedAt = session.user.updatedAt ?? session.user.updated_at;

  return {
    id: String(session.user.id),
    name: session.user.name ?? session.user.fullName ?? session.user.email,
    email: session.user.email,
    role,
    permissions: rolePermissions[role],
    status: "active",
    lastActiveAt: updatedAt ?? createdAt ?? new Date().toISOString(),
    workspaceScope: "global"
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  expiresAt: undefined,
  currentUser: null,
  hydrated: false,
  bootstrapSession: () => {
    const session = consumeRedirectSession() ?? readAdminAuthSession();
    const currentUser = session ? mapSessionUser(session) : null;

    if (session && currentUser) {
      writeAdminAuthSession(session);
      set({ token: session.token, expiresAt: session.expiresAt, currentUser, hydrated: true });
      return;
    }

    clearAdminAuthSession();
    set({ token: null, expiresAt: undefined, currentUser: null, hydrated: true });
  },
  setSession: (session) => {
    const currentUser = mapSessionUser(session);

    if (!currentUser) {
      clearAdminAuthSession();
      set({ token: null, expiresAt: undefined, currentUser: null, hydrated: true });
      return false;
    }

    writeAdminAuthSession(session);
    set({ token: session.token, expiresAt: session.expiresAt, currentUser, hydrated: true });
    return true;
  },
  clearSession: () => {
    clearAdminAuthSession();
    set({ token: null, expiresAt: undefined, currentUser: null, hydrated: true });
  },
  hasPermission: (permission) => {
    const user = get().currentUser;
    return user ? user.permissions.includes(permission) : false;
  }
}));
