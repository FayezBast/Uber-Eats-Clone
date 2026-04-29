import { backendAdminAdapter } from "@/services/backend-admin-adapter";
import type { PaginatedResponse, SupportTicketRecord, TicketFilters, TicketStatus } from "@/types";

export const supportService = {
  async listTickets(filters: TicketFilters): Promise<PaginatedResponse<SupportTicketRecord>> {
    return backendAdminAdapter.listTickets(filters);
  },

  async getTicketDetail(ticketId: string): Promise<SupportTicketRecord> {
    return backendAdminAdapter.getTicketDetail(ticketId);
  },

  async updateTicketStatus(ticketId: string, status: TicketStatus) {
    return backendAdminAdapter.updateTicketStatus(ticketId, status);
  },

  async addTicketNote(ticketId: string, body: string) {
    return backendAdminAdapter.addTicketNote(ticketId, body);
  }
};
