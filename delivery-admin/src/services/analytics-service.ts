import { backendAdminAdapter } from "@/services/backend-admin-adapter";
import type { AnalyticsSnapshot } from "@/types";

export const analyticsService = {
  async getAnalytics(): Promise<AnalyticsSnapshot> {
    return backendAdminAdapter.getAnalytics();
  }
};
