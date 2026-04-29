import type { FinanceFilters, OrderFilters, TicketFilters } from "@/types";

export const queryKeys = {
  overview: ["overview"] as const,
  notifications: ["notifications"] as const,
  orders: {
    all: ["orders"] as const,
    list: (filters: OrderFilters) => ["orders", "list", filters] as const,
    detail: (orderId: string) => ["orders", "detail", orderId] as const
  },
  dispatch: {
    all: ["dispatch"] as const,
    board: ["dispatch", "board"] as const
  },
  stores: {
    all: ["stores"] as const,
    list: ["stores", "list"] as const,
    detail: (storeId: string) => ["stores", "detail", storeId] as const
  },
  couriers: {
    all: ["couriers"] as const,
    list: ["couriers", "list"] as const,
    detail: (courierId: string) => ["couriers", "detail", courierId] as const
  },
  customers: {
    all: ["customers"] as const,
    list: ["customers", "list"] as const,
    detail: (customerId: string) => ["customers", "detail", customerId] as const
  },
  support: {
    all: ["support"] as const,
    list: (filters: TicketFilters) => ["support", "list", filters] as const,
    detail: (ticketId: string) => ["support", "detail", ticketId] as const
  },
  finance: {
    overview: ["finance", "overview"] as const,
    refunds: (filters: FinanceFilters) => ["finance", "refunds", filters] as const,
    payouts: (filters: FinanceFilters) => ["finance", "payouts", filters] as const
  },
  promotions: {
    all: ["promotions"] as const,
    list: ["promotions", "list"] as const,
    detail: (promotionId: string) => ["promotions", "detail", promotionId] as const
  },
  analytics: ["analytics"] as const,
  settings: {
    adminUsers: ["settings", "admin-users"] as const,
    auditLogs: ["settings", "audit-logs"] as const
  }
};
