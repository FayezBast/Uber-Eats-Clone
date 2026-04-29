import type {
  CourierStatus,
  MenuSyncStatus,
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  SettlementStatus,
  StoreStatus,
  TicketPriority,
  TicketStatus
} from "@/types";

export const orderStatusTone: Record<OrderStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  accepted: "info",
  preparing: "warning",
  ready_for_pickup: "info",
  assigned: "info",
  picked_up: "info",
  on_the_way: "info",
  delivered: "success",
  canceled: "danger",
  failed: "danger"
};

export const paymentStatusTone: Record<PaymentStatus, "default" | "success" | "warning" | "danger"> = {
  authorized: "warning",
  paid: "success",
  refunded: "default",
  partial_refund: "warning",
  failed: "danger"
};

export const courierStatusTone: Record<CourierStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  online: "success",
  offline: "default",
  paused: "warning",
  busy: "info",
  suspended: "danger"
};

export const storeStatusTone: Record<StoreStatus, "default" | "success" | "warning" | "danger"> = {
  online: "success",
  busy: "warning",
  offline: "default",
  disabled: "danger"
};

export const ticketStatusTone: Record<TicketStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  open: "danger",
  investigating: "warning",
  pending_partner: "info",
  resolved: "success",
  closed: "default"
};

export const ticketPriorityTone: Record<TicketPriority, "default" | "warning" | "danger" | "info"> = {
  urgent: "danger",
  high: "warning",
  medium: "info",
  low: "default"
};

export const settlementStatusTone: Record<SettlementStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  scheduled: "default",
  processing: "info",
  settled: "success",
  failed: "danger",
  held: "warning"
};

export const refundStatusTone: Record<RefundStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  approved: "info",
  rejected: "danger",
  processed: "success"
};

export const menuSyncStatusTone: Record<MenuSyncStatus, "default" | "success" | "warning" | "danger"> = {
  healthy: "success",
  warning: "warning",
  failed: "danger"
};

export const genericStatusTone: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  active: "success",
  restricted: "warning",
  blocked: "danger",
  invited: "info",
  disabled: "default",
  draft: "default",
  paused: "warning",
  expired: "default",
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "default"
};
