import { backendAdminAdapter } from "@/services/backend-admin-adapter";
import type { AdminUser, AuditLog } from "@/types";

export const settingsService = {
  async listAdminUsers(): Promise<AdminUser[]> {
    return backendAdminAdapter.listAdminUsers();
  },

  async listAuditLogs(): Promise<AuditLog[]> {
    return backendAdminAdapter.listAuditLogs();
  }
};
