import { backendAdminAdapter } from "@/services/backend-admin-adapter";
import type { Customer, CustomerDetail } from "@/types";

export const customersService = {
  async listCustomers(): Promise<Customer[]> {
    return backendAdminAdapter.listCustomers();
  },

  async getCustomerDetail(customerId: string): Promise<CustomerDetail> {
    return backendAdminAdapter.getCustomerDetail(customerId);
  },

  async updateCustomerStatus(customerId: string, accountStatus: Customer["accountStatus"]) {
    return backendAdminAdapter.updateCustomerStatus(customerId, accountStatus);
  },

  async addCustomerNote(customerId: string, body: string) {
    return backendAdminAdapter.addCustomerNote(customerId, body);
  },

  async issueCustomerCredit(customerId: string, amount: number, reason: string) {
    return backendAdminAdapter.issueCustomerCredit(customerId, amount, reason);
  },

  async flagCustomerRisk(customerId: string, riskLevel: Customer["riskLevel"]) {
    return backendAdminAdapter.flagCustomerRisk(customerId, riskLevel);
  }
};
