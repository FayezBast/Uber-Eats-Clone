import { backendAdminAdapter } from "@/services/backend-admin-adapter";
import type { FinanceFilters, FinanceOverview, PaginatedResponse, Payout, Refund } from "@/types";

export const financeService = {
  async getOverview(): Promise<FinanceOverview> {
    return backendAdminAdapter.getFinanceOverview();
  },

  async listRefunds(filters: FinanceFilters): Promise<PaginatedResponse<Refund>> {
    return backendAdminAdapter.listRefunds(filters);
  },

  async listPayouts(filters: FinanceFilters): Promise<PaginatedResponse<Payout>> {
    return backendAdminAdapter.listPayouts(filters);
  }
};
