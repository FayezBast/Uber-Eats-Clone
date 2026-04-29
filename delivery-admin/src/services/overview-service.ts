import { backendAdminAdapter } from "@/services/backend-admin-adapter";
import type { OverviewSnapshot } from "@/types";

export const overviewService = {
  async getOverview(): Promise<OverviewSnapshot> {
    return backendAdminAdapter.getOverview();
  }
};
