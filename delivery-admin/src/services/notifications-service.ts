import { backendAdminAdapter } from "@/services/backend-admin-adapter";
import type { Notification } from "@/types";

export const notificationsService = {
  async listNotifications(): Promise<Notification[]> {
    return backendAdminAdapter.listNotifications();
  }
};
