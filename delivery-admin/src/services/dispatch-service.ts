import { backendAdminAdapter } from "@/services/backend-admin-adapter";
import type { DispatchSnapshot } from "@/types";

export const dispatchService = {
  async getDispatchSnapshot(): Promise<DispatchSnapshot> {
    return backendAdminAdapter.getDispatchSnapshot();
  },

  async pauseCourier(courierId: string) {
    return backendAdminAdapter.pauseCourier(courierId);
  },

  async flagDeliveryIncident(orderId: string, issue: string) {
    return backendAdminAdapter.flagDeliveryIncident(orderId, issue);
  }
};
