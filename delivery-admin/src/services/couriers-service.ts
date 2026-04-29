import { backendAdminAdapter } from "@/services/backend-admin-adapter";
import type { Courier, CourierDetail, CourierStatus } from "@/types";

export const couriersService = {
  async listCouriers(): Promise<Courier[]> {
    return backendAdminAdapter.listCouriers();
  },

  async getCourierDetail(courierId: string): Promise<CourierDetail> {
    return backendAdminAdapter.getCourierDetail(courierId);
  },

  async updateCourierStatus(courierId: string, status: CourierStatus) {
    return backendAdminAdapter.updateCourierStatus(courierId, status);
  },

  async changeCourierZone(courierId: string, zone: string) {
    return backendAdminAdapter.changeCourierZone(courierId, zone);
  },

  async reviewCourierDocument(courierId: string, documentId: string, status: "approved" | "rejected") {
    return backendAdminAdapter.reviewCourierDocument(courierId, documentId, status);
  },

  async sendCourierNotification(courierId: string, message: string) {
    return backendAdminAdapter.sendCourierNotification(courierId, message);
  }
};
