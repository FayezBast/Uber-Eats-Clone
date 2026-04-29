import { backendAdminAdapter } from "@/services/backend-admin-adapter";
import type { OrderDetail, OrderFilters, OrderRecord, PaginatedResponse } from "@/types";

export const ordersService = {
  async listOrders(filters: OrderFilters): Promise<PaginatedResponse<OrderRecord>> {
    return backendAdminAdapter.listOrders(filters);
  },

  async getOrderDetail(orderId: string): Promise<OrderDetail> {
    return backendAdminAdapter.getOrderDetail(orderId);
  },

  async assignCourier(orderIds: string[], courierId: string, note?: string) {
    return backendAdminAdapter.assignCourier(orderIds, courierId, note);
  },

  async markIssue(orderId: string, issue: string) {
    return backendAdminAdapter.markIssue(orderId, issue);
  },

  async refundOrder(orderId: string, amount: number, reason: string) {
    return backendAdminAdapter.refundOrder(orderId, amount, reason);
  },

  async cancelOrder(orderId: string, reason: string) {
    return backendAdminAdapter.cancelOrder(orderId, reason);
  }
};
