import { backendAdminAdapter } from "@/services/backend-admin-adapter";
import type { Store, StoreDetail, StoreStatus } from "@/types";

export const storesService = {
  async listStores(): Promise<Store[]> {
    return backendAdminAdapter.listStores();
  },

  async getStoreDetail(storeId: string): Promise<StoreDetail> {
    return backendAdminAdapter.getStoreDetail(storeId);
  },

  async updateStoreStatus(storeId: string, status: StoreStatus) {
    return backendAdminAdapter.updateStoreStatus(storeId, status);
  },

  async adjustPrepTime(storeId: string, averagePrepTimeMinutes: number) {
    return backendAdminAdapter.adjustPrepTime(storeId, averagePrepTimeMinutes);
  },

  async updateServiceArea(storeId: string, serviceArea: string[]) {
    return backendAdminAdapter.updateServiceArea(storeId, serviceArea);
  },

  async updateCommissionPlan(storeId: string, commissionPlan: string) {
    return backendAdminAdapter.updateCommissionPlan(storeId, commissionPlan);
  }
};
