export type ThemeMode = "light" | "dark" | "system";
export type SortDirection = "asc" | "desc";

export type AdminRole =
  | "super_admin"
  | "operations_manager"
  | "dispatcher"
  | "support_agent"
  | "finance_admin"
  | "store_success_manager";

export type Permission =
  | "dashboard:view"
  | "orders:view"
  | "orders:assign"
  | "orders:refund"
  | "orders:cancel"
  | "dispatch:view"
  | "dispatch:manage"
  | "stores:view"
  | "stores:update"
  | "couriers:view"
  | "couriers:update"
  | "customers:view"
  | "customers:update"
  | "support:view"
  | "support:manage"
  | "finance:view"
  | "promotions:view"
  | "promotions:manage"
  | "analytics:view"
  | "settings:view"
  | "settings:manage";

export type WorkspaceScope = "global" | "beirut" | "dubai" | "riyadh";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready_for_pickup"
  | "assigned"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "canceled"
  | "failed";

export type PaymentStatus = "authorized" | "paid" | "refunded" | "partial_refund" | "failed";
export type OrderType = "delivery" | "pickup" | "scheduled";
export type CancellationReason =
  | "customer_changed_mind"
  | "store_closed"
  | "out_of_stock"
  | "payment_failure"
  | "courier_unavailable"
  | "address_issue";

export type CourierStatus = "online" | "offline" | "paused" | "busy" | "suspended";
export type VehicleType = "bike" | "scooter" | "car" | "walker";
export type StoreStatus = "online" | "busy" | "offline" | "disabled";
export type MenuSyncStatus = "healthy" | "warning" | "failed";
export type TicketPriority = "urgent" | "high" | "medium" | "low";
export type TicketStatus = "open" | "investigating" | "pending_partner" | "resolved" | "closed";
export type TicketType =
  | "missing_item"
  | "late_order"
  | "wrong_address"
  | "courier_no_show"
  | "store_closed"
  | "payment_issue";
export type SettlementStatus = "scheduled" | "processing" | "settled" | "failed" | "held";
export type RefundStatus = "pending" | "approved" | "rejected" | "processed";
export type NotificationType = "order" | "dispatch" | "support" | "store" | "finance";
export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type PromoType = "percentage" | "flat";
export type PayoutTargetType = "store" | "courier";

export interface Address {
  line1: string;
  area: string;
  city: string;
  zone: string;
  lat: number;
  lng: number;
  instructions?: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  actorRole: AdminRole | "system";
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  note?: string;
}

export interface SupportNote {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers?: string[];
}

export interface PricingBreakdown {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  discount: number;
  tip: number;
  total: number;
}

export interface OrderTimelineEvent {
  id: string;
  status: OrderStatus;
  title: string;
  description: string;
  timestamp: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpend: number;
  refundsCount: number;
  refundsValue: number;
  cancellationRate: number;
  accountStatus: "active" | "restricted" | "blocked";
  riskLevel: "low" | "medium" | "high";
  joinedAt: string;
  savedAddresses: Address[];
  supportNotes: SupportNote[];
}

export interface Store {
  id: string;
  name: string;
  brand: string;
  status: StoreStatus;
  city: string;
  zone: string;
  rating: number;
  averagePrepTimeMinutes: number;
  cancellationRate: number;
  commissionPlan: string;
  openingHours: string;
  menuSyncStatus: MenuSyncStatus;
  temporaryClosureReason?: string;
  payoutBalance: number;
  serviceArea: string[];
  complaintsLast30Days: number;
}

export interface CourierDocument {
  id: string;
  name: string;
  status: "approved" | "pending" | "rejected";
  expiresAt?: string;
}

export interface Courier {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CourierStatus;
  vehicleType: VehicleType;
  currentCapacity: number;
  zone: string;
  city: string;
  activeTasks: number;
  acceptanceRate: number;
  completionRate: number;
  lateRate: number;
  performanceScore: number;
  earningsToday: number;
  completedDeliveries: number;
  incidentCount: number;
  documents: CourierDocument[];
}

export interface Order {
  id: string;
  externalId: string;
  customerId: string;
  storeId: string;
  courierId?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  amount: number;
  city: string;
  zone: string;
  orderType: OrderType;
  createdAt: string;
  etaAt: string;
  promisedAt: string;
  averagePrepTimeMinutes: number;
  averageDeliveryTimeMinutes: number;
  issueFlags: string[];
  items: OrderItem[];
  pricing: PricingBreakdown;
  timeline: OrderTimelineEvent[];
  deliveryAddress: Address;
  supportNotes: SupportNote[];
  cancellationReason?: CancellationReason;
}

export interface OrderRecord extends Order {
  customer: Customer;
  store: Store;
  courier?: Courier;
}

export interface OrderDetail extends OrderRecord {
  auditLogs: AuditLog[];
}

export interface SupportTicket {
  id: string;
  orderId?: string;
  customerId?: string;
  storeId?: string;
  courierId?: string;
  priority: TicketPriority;
  status: TicketStatus;
  type: TicketType;
  region: string;
  slaRisk: boolean;
  subject: string;
  createdAt: string;
  updatedAt: string;
  participants: string[];
  notes: SupportNote[];
  compensationSuggested: number;
}

export interface SupportTicketRecord extends SupportTicket {
  customer?: Customer;
  store?: Store;
  courier?: Courier;
  order?: OrderRecord;
}

export interface StoreDetail extends Store {
  recentComplaints: SupportTicketRecord[];
  payoutSummary: Payout[];
  recentOrders: OrderRecord[];
}

export interface CourierDetail extends Courier {
  incidentHistory: SupportTicketRecord[];
  payoutHistory: Payout[];
  activeOrders: OrderRecord[];
}

export interface CustomerDetail extends Customer {
  orderHistory: OrderRecord[];
  tickets: SupportTicketRecord[];
  refundHistory: Refund[];
}

export interface Refund {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  createdAt: string;
  approvedBy?: string;
}

export interface Payout {
  id: string;
  targetType: PayoutTargetType;
  targetId: string;
  targetName: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
  status: SettlementStatus;
  scheduledAt: string;
}

export interface PromoCampaign {
  id: string;
  name: string;
  code: string;
  status: "draft" | "active" | "paused" | "expired";
  promoType: PromoType;
  percentageOff?: number;
  flatAmountOff?: number;
  firstOrderOnly: boolean;
  city?: string;
  storeIds: string[];
  startAt: string;
  endAt: string;
  budgetCap: number;
  totalRedemptions: number;
  totalDiscountValue: number;
  abuseNotes: string[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: Permission[];
  status: "active" | "invited" | "disabled";
  lastActiveAt: string;
  workspaceScope: WorkspaceScope;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  severity: IncidentSeverity;
  createdAt: string;
  read: boolean;
}

export interface OverviewMetric {
  label: string;
  value: number;
  change: number;
  trend: "up" | "down" | "flat";
  format: "number" | "currency" | "minutes";
}

export interface ChartPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

export interface ActivityFeedItem {
  id: string;
  type: NotificationType;
  title: string;
  detail: string;
  timestamp: string;
  severity: IncidentSeverity;
}

export interface OverviewSnapshot {
  metrics: {
    totalOrdersToday: OverviewMetric;
    activeDeliveries: OverviewMetric;
    completedOrders: OverviewMetric;
    canceledOrders: OverviewMetric;
    averageDeliveryTime: OverviewMetric;
    averagePrepTime: OverviewMetric;
    grossSales: OverviewMetric;
    refunds: OverviewMetric;
    activeCouriers: OverviewMetric;
    onlineStores: OverviewMetric;
  };
  ordersOverTime: ChartPoint[];
  salesOverTime: ChartPoint[];
  cancellationsByReason: ChartPoint[];
  courierUtilization: ChartPoint[];
  activityFeed: ActivityFeedItem[];
}

export interface DispatchSnapshot {
  unassignedOrders: OrderRecord[];
  pickingUpOrders: OrderRecord[];
  onTheWayOrders: OrderRecord[];
  delayedOrders: OrderRecord[];
  failedOrders: OrderRecord[];
  couriers: Courier[];
  lastUpdatedAt: string;
}

export interface FinanceOverview {
  gmv: number;
  netRevenue: number;
  platformFees: number;
  refunds: number;
  promoCosts: number;
  commissions: number;
}

export interface AnalyticsSnapshot {
  orders: ChartPoint[];
  deliveryPerformance: ChartPoint[];
  storePerformance: ChartPoint[];
  courierPerformance: ChartPoint[];
  customerRetention: ChartPoint[];
  cancellationsRefunds: ChartPoint[];
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface OrderFilters {
  search: string;
  page: number;
  pageSize: number;
  startDate?: string;
  endDate?: string;
  city?: string;
  zone?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  storeId?: string;
  courierId?: string;
  orderType?: OrderType;
  sortBy?: keyof Order | "customer" | "store" | "courier";
  sortDirection?: SortDirection;
}

export interface TicketFilters {
  search: string;
  page: number;
  pageSize: number;
  priority?: TicketPriority;
  type?: TicketType;
  region?: string;
  status?: TicketStatus;
  slaRisk?: "true" | "false";
}

export interface FinanceFilters {
  page: number;
  pageSize: number;
  startDate?: string;
  endDate?: string;
  status?: SettlementStatus | RefundStatus;
}

export interface PromotionFormValues {
  name: string;
  code: string;
  promoType: PromoType;
  percentageOff?: number;
  flatAmountOff?: number;
  firstOrderOnly: boolean;
  city?: string;
  storeIds: string[];
  startAt: string;
  endAt: string;
  budgetCap: number;
  abuseNotes: string;
}
