import { rolePermissions } from "@/constants/roles";
import { httpClient } from "@/services/http-client";
import type {
  ActivityFeedItem,
  AdminUser,
  AnalyticsSnapshot,
  AuditLog,
  Courier,
  CourierDetail,
  Customer,
  CustomerDetail,
  DispatchSnapshot,
  FinanceFilters,
  FinanceOverview,
  Order,
  OrderDetail,
  OrderFilters,
  OrderRecord,
  OrderStatus,
  OverviewSnapshot,
  PaginatedResponse,
  Payout,
  Refund,
  Store,
  StoreDetail,
  SupportTicketRecord,
  TicketFilters
} from "@/types";

interface BackendUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

interface BackendDelivery {
  id: number;
  customer_id: number;
  customer?: BackendUser;
  driver_id?: number;
  driver?: BackendUser;
  pickup_address: string;
  dropoff_address: string;
  estimated_distance_km: number;
  price_cents: number;
  price_display: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BackendDashboard {
  generated_at: string;
  metrics: {
    total_users: number;
    total_customers: number;
    total_drivers: number;
    total_admins: number;
    total_deliveries: number;
    pending_deliveries: number;
    active_deliveries: number;
    completed_deliveries: number;
    total_revenue_cents: number;
    total_revenue_display: string;
    unread_notifications: number;
  };
  recent_deliveries: BackendDelivery[];
}

interface BackendDriverSummary {
  id: number;
  name: string;
  email: string;
  active_deliveries: number;
  completed_deliveries: number;
}

interface BackendActivityLog {
  id: number;
  delivery_id: number;
  status: string;
  note: string;
  created_at: string;
  changed_by?: BackendUser;
  delivery?: BackendDelivery;
}

interface BackendNotification {
  id: number;
  type: string;
  message: string;
  read_at?: string | null;
  created_at: string;
}

const unsupported = (..._args: unknown[]) => {
  throw new Error("This action is not available in the backend API yet.");
};

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function normalizeDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function addMinutes(value: string, minutes: number) {
  return new Date(new Date(value).getTime() + minutes * 60_000).toISOString();
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function parseAddressParts(value: string) {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  const line1 = parts[0] ?? value;
  const city = parts[parts.length - 1] ?? "Beirut";
  const area = parts.length > 2 ? parts[parts.length - 2]! : city;

  return { line1, city, area, zone: area };
}

function amountFromDelivery(delivery: BackendDelivery) {
  return Math.round((delivery.price_cents / 100) * 100) / 100;
}

function mapOrderStatus(status: string): OrderStatus {
  switch (status) {
    case "pending":
    case "accepted":
    case "picked_up":
    case "delivered":
      return status;
    default:
      return "pending";
  }
}

function deliveryTimeline(status: OrderStatus, createdAt: string, updatedAt: string) {
  const steps: Array<{ status: OrderStatus; title: string; description: string; timestamp: string }> = [
    {
      status: "pending",
      title: "Delivery requested",
      description: "Customer created the delivery request.",
      timestamp: createdAt
    }
  ];

  if (["accepted", "picked_up", "delivered"].includes(status)) {
    steps.push({
      status: "accepted",
      title: "Driver assigned",
      description: "Delivery was accepted or assigned to a driver.",
      timestamp: updatedAt
    });
  }

  if (["picked_up", "delivered"].includes(status)) {
    steps.push({
      status: "picked_up",
      title: "Package picked up",
      description: "Driver picked up the delivery.",
      timestamp: updatedAt
    });
  }

  if (status === "delivered") {
    steps.push({
      status: "delivered",
      title: "Delivered",
      description: "Delivery was completed.",
      timestamp: updatedAt
    });
  }

  return steps.map((step, index) => ({ id: `${step.status}-${index}`, ...step }));
}

function mapCustomer(user: BackendUser | undefined, fallbackId: number, deliveries: BackendDelivery[]): Customer {
  const customerDeliveries = deliveries.filter((delivery) => delivery.customer_id === fallbackId);
  const delivered = customerDeliveries.filter((delivery) => delivery.status === "delivered");
  const totalSpend = sum(delivered.map(amountFromDelivery));
  const joinedAt = customerDeliveries.map((delivery) => delivery.created_at).sort()[0];

  return {
    id: String(user?.id ?? fallbackId),
    name: user?.name ?? `Customer ${fallbackId}`,
    email: user?.email ?? `customer-${fallbackId}@unknown.local`,
    phone: "Not provided",
    totalOrders: customerDeliveries.length,
    totalSpend,
    refundsCount: 0,
    refundsValue: 0,
    cancellationRate: 0,
    accountStatus: "active",
    riskLevel: "low",
    joinedAt: normalizeDate(joinedAt),
    savedAddresses: customerDeliveries.slice(0, 3).map((delivery) => ({
      id: `addr-${delivery.id}`,
      ...parseAddressParts(delivery.dropoff_address),
      lat: 0,
      lng: 0
    })),
    supportNotes: []
  };
}

function storeFromDelivery(delivery: BackendDelivery, deliveries: BackendDelivery[]): Store {
  const address = parseAddressParts(delivery.pickup_address);
  const storeId = `pickup-${hashString(delivery.pickup_address)}`;
  const storeDeliveries = deliveries.filter((candidate) => `pickup-${hashString(candidate.pickup_address)}` === storeId);
  const delivered = storeDeliveries.filter((candidate) => candidate.status === "delivered");

  return {
    id: storeId,
    name: address.line1,
    brand: address.line1,
    status: storeDeliveries.some((candidate) => candidate.status !== "delivered") ? "busy" : "online",
    city: address.city,
    zone: address.zone,
    rating: 4.7,
    averagePrepTimeMinutes: 0,
    cancellationRate: 0,
    commissionPlan: "Delivery-only",
    openingHours: "Backend delivery location",
    menuSyncStatus: "healthy",
    payoutBalance: sum(delivered.map(amountFromDelivery)),
    serviceArea: Array.from(new Set(storeDeliveries.map((candidate) => parseAddressParts(candidate.dropoff_address).zone))),
    complaintsLast30Days: 0
  };
}

function mapCourierFromDriver(driver: BackendDriverSummary): Courier {
  return {
    id: String(driver.id),
    name: driver.name,
    email: driver.email,
    phone: "Not provided",
    status: driver.active_deliveries > 0 ? "busy" : "online",
    vehicleType: "car",
    currentCapacity: Math.max(1, driver.active_deliveries || 3),
    zone: "All zones",
    city: "Operations",
    activeTasks: driver.active_deliveries,
    acceptanceRate: 100,
    completionRate: driver.completed_deliveries ? 100 : 0,
    lateRate: 0,
    performanceScore: Math.min(100, 85 + Math.min(driver.completed_deliveries, 15)),
    earningsToday: 0,
    completedDeliveries: driver.completed_deliveries,
    incidentCount: 0,
    documents: []
  };
}

function mapCourierFromUser(user: BackendUser | undefined, drivers: BackendDriverSummary[]): Courier | undefined {
  if (!user) {
    return undefined;
  }

  const summary = drivers.find((driver) => driver.id === user.id);
  return summary
    ? mapCourierFromDriver(summary)
    : {
        id: String(user.id),
        name: user.name,
        email: user.email,
        phone: "Not provided",
        status: "busy",
        vehicleType: "car",
        currentCapacity: 1,
        zone: "All zones",
        city: "Operations",
        activeTasks: 1,
        acceptanceRate: 100,
        completionRate: 0,
        lateRate: 0,
        performanceScore: 85,
        earningsToday: 0,
        completedDeliveries: 0,
        incidentCount: 0,
        documents: []
      };
}

function mapDeliveryToOrderRecord(delivery: BackendDelivery, deliveries: BackendDelivery[], drivers: BackendDriverSummary[]): OrderRecord {
  const status = mapOrderStatus(delivery.status);
  const createdAt = normalizeDate(delivery.created_at);
  const updatedAt = normalizeDate(delivery.updated_at);
  const amount = amountFromDelivery(delivery);
  const pickupStore = storeFromDelivery(delivery, deliveries);
  const dropoffAddress = parseAddressParts(delivery.dropoff_address);

  return {
    id: String(delivery.id),
    externalId: `DLV-${String(delivery.id).padStart(6, "0")}`,
    customerId: String(delivery.customer_id),
    storeId: pickupStore.id,
    courierId: delivery.driver_id ? String(delivery.driver_id) : undefined,
    status,
    paymentStatus: status === "delivered" ? "paid" : "authorized",
    amount,
    city: dropoffAddress.city,
    zone: dropoffAddress.zone,
    orderType: "delivery",
    createdAt,
    etaAt: addMinutes(updatedAt, status === "delivered" ? 0 : 25),
    promisedAt: addMinutes(createdAt, 45),
    averagePrepTimeMinutes: 0,
    averageDeliveryTimeMinutes: Math.max(0, Math.round((new Date(updatedAt).getTime() - new Date(createdAt).getTime()) / 60_000)),
    issueFlags: [],
    items: [
      {
        id: `delivery-fee-${delivery.id}`,
        name: `Delivery from ${pickupStore.name}`,
        quantity: 1,
        unitPrice: amount
      }
    ],
    pricing: {
      subtotal: 0,
      deliveryFee: amount,
      serviceFee: 0,
      tax: 0,
      discount: 0,
      tip: 0,
      total: amount
    },
    timeline: deliveryTimeline(status, createdAt, updatedAt),
    deliveryAddress: { ...dropoffAddress, lat: 0, lng: 0 },
    supportNotes: [],
    customer: mapCustomer(delivery.customer, delivery.customer_id, deliveries),
    store: pickupStore,
    courier: mapCourierFromUser(delivery.driver, drivers)
  };
}

function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    page,
    pageSize,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize))
  };
}

function isWithinDateRange(value: string, startDate?: string, endDate?: string) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return (!startDate || timestamp >= new Date(startDate).getTime()) && (!endDate || timestamp <= new Date(endDate).getTime());
}

function searchMatch(query: string, values: Array<string | number | undefined>) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return values
    .filter((value): value is string | number => value !== undefined)
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function sortOrders(items: OrderRecord[], filters: OrderFilters) {
  const direction = filters.sortDirection ?? "desc";
  const sorted = [...items].sort((left, right) => {
    const leftValue = getOrderSortValue(left, filters.sortBy);
    const rightValue = getOrderSortValue(right, filters.sortBy);
    const result = leftValue > rightValue ? 1 : leftValue < rightValue ? -1 : 0;
    return direction === "asc" ? result : -result;
  });

  return sorted;
}

function getOrderSortValue(order: OrderRecord, sortBy: OrderFilters["sortBy"]) {
  switch (sortBy) {
    case "customer":
      return order.customer.name;
    case "store":
      return order.store.name;
    case "courier":
      return order.courier?.name ?? "";
    case "amount":
      return order.amount;
    case "etaAt":
      return order.etaAt;
    case "status":
      return order.status;
    default:
      return order.createdAt;
  }
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function hourlyBuckets(orders: OrderRecord[], dateField: keyof Pick<Order, "createdAt"> = "createdAt") {
  return Array.from({ length: 8 }).map((_, index) => {
    const bucketDate = new Date(Date.now() - (7 - index) * 60 * 60_000);
    const label = bucketDate.toLocaleTimeString("en-US", { hour: "numeric" });
    const bucketOrders = orders.filter((order) => new Date(order[dateField]).getHours() === bucketDate.getHours());

    return {
      label,
      value: bucketOrders.length,
      secondaryValue: sum(bucketOrders.filter((order) => order.status === "delivered").map((order) => order.amount))
    };
  });
}

function mapActivityLog(log: BackendActivityLog): AuditLog {
  return {
    id: String(log.id),
    actorName: log.changed_by?.name ?? "System",
    actorRole: log.changed_by?.role === "admin" ? "super_admin" : "system",
    action: `Delivery ${titleCase(log.status)}`,
    entityType: "delivery",
    entityId: String(log.delivery_id),
    timestamp: normalizeDate(log.created_at),
    note: log.note
  };
}

function mapActivityFeed(logs: BackendActivityLog[], notifications: BackendNotification[]): ActivityFeedItem[] {
  const logItems = logs.map((log) => ({
    id: `log-${log.id}`,
    type: "dispatch" as const,
    title: `Delivery ${log.delivery_id} ${titleCase(log.status)}`,
    detail: log.note || "Status changed",
    timestamp: normalizeDate(log.created_at),
    severity: log.status === "delivered" ? ("low" as const) : ("medium" as const)
  }));
  const notificationItems = notifications.map((notification) => ({
    id: `not-${notification.id}`,
    type: "order" as const,
    title: titleCase(notification.type),
    detail: notification.message,
    timestamp: normalizeDate(notification.created_at),
    severity: notification.read_at ? ("low" as const) : ("medium" as const)
  }));

  return [...logItems, ...notificationItems].sort((left, right) => +new Date(right.timestamp) - +new Date(left.timestamp)).slice(0, 12);
}

function buildDerivedTickets(orders: OrderRecord[]): SupportTicketRecord[] {
  const now = Date.now();
  return orders
    .filter((order) => order.status !== "delivered" && new Date(order.promisedAt).getTime() < now)
    .map((order) => ({
      id: `delay-${order.id}`,
      orderId: order.id,
      customerId: order.customerId,
      storeId: order.storeId,
      courierId: order.courierId,
      priority: "high",
      status: "open",
      type: "late_order",
      region: `${order.city} / ${order.zone}`,
      slaRisk: true,
      subject: `Delivery ${order.externalId} is past promised time`,
      createdAt: order.promisedAt,
      updatedAt: new Date().toISOString(),
      participants: ["Operations", "Dispatch"],
      notes: [
        {
          id: `delay-note-${order.id}`,
          author: "System",
          body: "Derived from live delivery promise time.",
          createdAt: new Date().toISOString()
        }
      ],
      compensationSuggested: Math.min(order.amount, 5),
      customer: order.customer,
      store: order.store,
      courier: order.courier,
      order
    }));
}

async function getDashboard() {
  return httpClient.get<BackendDashboard>("/admin/dashboard");
}

async function getDeliveries() {
  const response = await httpClient.get<{ count: number; deliveries: BackendDelivery[] }>("/admin/deliveries");
  return response.deliveries;
}

async function getDrivers() {
  const response = await httpClient.get<{ count: number; drivers: BackendDriverSummary[] }>("/admin/drivers");
  return response.drivers;
}

async function getLogs() {
  const response = await httpClient.get<{ count: number; logs: BackendActivityLog[] }>("/admin/logs");
  return response.logs;
}

async function getNotifications() {
  const response = await httpClient.get<{ count: number; notifications: BackendNotification[] }>("/notifications");
  return response.notifications;
}

async function getOrders() {
  const [deliveries, drivers] = await Promise.all([getDeliveries(), getDrivers()]);
  return deliveries.map((delivery) => mapDeliveryToOrderRecord(delivery, deliveries, drivers));
}

export const backendAdminAdapter = {
  async getOverview(): Promise<OverviewSnapshot> {
    const [dashboard, orders, drivers, logs, notifications] = await Promise.all([
      getDashboard(),
      getOrders(),
      getDrivers(),
      getLogs(),
      getNotifications()
    ]);
    const metrics = dashboard.metrics;
    const deliveredOrders = orders.filter((order) => order.status === "delivered");
    const buckets = hourlyBuckets(orders);

    return {
      metrics: {
        totalOrdersToday: { label: "Total Deliveries", value: metrics.total_deliveries, change: 0, trend: "flat", format: "number" },
        activeDeliveries: { label: "Active Deliveries", value: metrics.active_deliveries, change: 0, trend: "flat", format: "number" },
        completedOrders: { label: "Completed Deliveries", value: metrics.completed_deliveries, change: 0, trend: "flat", format: "number" },
        canceledOrders: { label: "Canceled Deliveries", value: 0, change: 0, trend: "flat", format: "number" },
        averageDeliveryTime: {
          label: "Avg Delivery Time",
          value: deliveredOrders.length ? sum(deliveredOrders.map((order) => order.averageDeliveryTimeMinutes)) / deliveredOrders.length : 0,
          change: 0,
          trend: "flat",
          format: "minutes"
        },
        averagePrepTime: { label: "Avg Prep Time", value: 0, change: 0, trend: "flat", format: "minutes" },
        grossSales: { label: "Gross Sales", value: metrics.total_revenue_cents / 100, change: 0, trend: "flat", format: "currency" },
        refunds: { label: "Refunds", value: 0, change: 0, trend: "flat", format: "currency" },
        activeCouriers: {
          label: "Active Couriers",
          value: drivers.filter((driver) => driver.active_deliveries > 0).length,
          change: 0,
          trend: "flat",
          format: "number"
        },
        onlineStores: { label: "Pickup Locations", value: uniqueById(orders.map((order) => order.store)).length, change: 0, trend: "flat", format: "number" }
      },
      ordersOverTime: buckets.map(({ label, value }) => ({ label, value })),
      salesOverTime: buckets.map(({ label, secondaryValue = 0 }) => ({ label, value: secondaryValue })),
      cancellationsByReason: [],
      courierUtilization: drivers.map((driver) => ({
        label: driver.name,
        value: Math.min(100, Math.round((driver.active_deliveries / Math.max(1, driver.active_deliveries + 2)) * 100))
      })),
      activityFeed: mapActivityFeed(logs, notifications)
    };
  },

  async listOrders(filters: OrderFilters) {
    const orders = await getOrders();
    const filtered = orders
      .filter((order) => isWithinDateRange(order.createdAt, filters.startDate, filters.endDate))
      .filter((order) => !filters.city || order.city === filters.city)
      .filter((order) => !filters.zone || order.zone === filters.zone)
      .filter((order) => !filters.status || order.status === filters.status)
      .filter((order) => !filters.paymentStatus || order.paymentStatus === filters.paymentStatus)
      .filter((order) => !filters.storeId || order.storeId === filters.storeId)
      .filter((order) => !filters.courierId || order.courierId === filters.courierId)
      .filter((order) => !filters.orderType || order.orderType === filters.orderType)
      .filter((order) =>
        searchMatch(filters.search, [
          order.externalId,
          order.customer.name,
          order.customer.email,
          order.store.name,
          order.courier?.name,
          order.status,
          order.city,
          order.zone
        ])
      );

    return paginate(sortOrders(filtered, filters), filters.page, filters.pageSize);
  },

  async getOrderDetail(orderId: string): Promise<OrderDetail> {
    const [orders, logs] = await Promise.all([getOrders(), getLogs()]);
    const order = orders.find((candidate) => candidate.id === orderId);

    if (!order) {
      throw new Error("Delivery not found");
    }

    return {
      ...order,
      auditLogs: logs.filter((log) => String(log.delivery_id) === orderId).map(mapActivityLog)
    };
  },

  async assignCourier(orderIds: string[], courierId: string, note?: string) {
    await Promise.all(
      orderIds.map((orderId) =>
        httpClient.post(`/admin/deliveries/${orderId}/assign`, { driver_id: Number(courierId), note: note?.trim() || undefined }, "PATCH")
      )
    );
    return { success: true };
  },

  markIssue: unsupported,
  refundOrder: unsupported,
  cancelOrder: unsupported,

  async getDispatchSnapshot(): Promise<DispatchSnapshot> {
    const [orders, couriers] = await Promise.all([getOrders(), this.listCouriers()]);
    const now = Date.now();

    return {
      unassignedOrders: orders.filter((order) => order.status === "pending" && !order.courierId),
      pickingUpOrders: orders.filter((order) => order.status === "accepted"),
      onTheWayOrders: orders.filter((order) => order.status === "picked_up"),
      delayedOrders: orders.filter((order) => order.status !== "delivered" && new Date(order.promisedAt).getTime() < now),
      failedOrders: [],
      couriers,
      lastUpdatedAt: new Date().toISOString()
    };
  },

  pauseCourier: unsupported,
  flagDeliveryIncident: unsupported,

  async listCouriers() {
    const drivers = await getDrivers();
    return drivers.map(mapCourierFromDriver);
  },

  async getCourierDetail(courierId: string): Promise<CourierDetail> {
    const [couriers, orders] = await Promise.all([this.listCouriers(), getOrders()]);
    const courier = couriers.find((candidate) => candidate.id === courierId);

    if (!courier) {
      throw new Error("Courier not found");
    }

    return {
      ...courier,
      incidentHistory: [],
      payoutHistory: [],
      activeOrders: orders.filter((order) => order.courierId === courierId && order.status !== "delivered")
    };
  },

  updateCourierStatus: unsupported,
  changeCourierZone: unsupported,
  reviewCourierDocument: unsupported,
  sendCourierNotification: unsupported,

  async listCustomers() {
    const orders = await getOrders();
    return uniqueById(orders.map((order) => order.customer));
  },

  async getCustomerDetail(customerId: string): Promise<CustomerDetail> {
    const [customers, orders] = await Promise.all([this.listCustomers(), getOrders()]);
    const customer = customers.find((candidate) => candidate.id === customerId);

    if (!customer) {
      throw new Error("Customer not found");
    }

    return {
      ...customer,
      orderHistory: orders.filter((order) => order.customerId === customerId),
      tickets: buildDerivedTickets(orders).filter((ticket) => ticket.customerId === customerId),
      refundHistory: []
    };
  },

  updateCustomerStatus: unsupported,
  addCustomerNote: unsupported,
  issueCustomerCredit: unsupported,
  flagCustomerRisk: unsupported,

  async listStores() {
    const orders = await getOrders();
    return uniqueById(orders.map((order) => order.store));
  },

  async getStoreDetail(storeId: string): Promise<StoreDetail> {
    const [stores, orders] = await Promise.all([this.listStores(), getOrders()]);
    const store = stores.find((candidate) => candidate.id === storeId);

    if (!store) {
      throw new Error("Pickup location not found");
    }

    return {
      ...store,
      recentComplaints: buildDerivedTickets(orders).filter((ticket) => ticket.storeId === storeId),
      payoutSummary: [],
      recentOrders: orders.filter((order) => order.storeId === storeId)
    };
  },

  updateStoreStatus: unsupported,
  adjustPrepTime: unsupported,
  updateServiceArea: unsupported,
  updateCommissionPlan: unsupported,

  async listTickets(filters: TicketFilters) {
    const orders = await getOrders();
    const tickets = buildDerivedTickets(orders)
      .filter((ticket) => !filters.priority || ticket.priority === filters.priority)
      .filter((ticket) => !filters.type || ticket.type === filters.type)
      .filter((ticket) => !filters.region || ticket.region === filters.region)
      .filter((ticket) => !filters.status || ticket.status === filters.status)
      .filter((ticket) => !filters.slaRisk || String(ticket.slaRisk) === filters.slaRisk)
      .filter((ticket) => searchMatch(filters.search, [ticket.id, ticket.subject, ticket.customer?.name, ticket.store?.name, ticket.order?.externalId]));

    return paginate(tickets, filters.page, filters.pageSize);
  },

  async getTicketDetail(ticketId: string) {
    const tickets = (await this.listTickets({ search: "", page: 1, pageSize: 500 })).data;
    const ticket = tickets.find((candidate) => candidate.id === ticketId);

    if (!ticket) {
      throw new Error("Ticket not found");
    }

    return ticket;
  },

  updateTicketStatus: unsupported,
  addTicketNote: unsupported,

  async getFinanceOverview(): Promise<FinanceOverview> {
    const orders = await getOrders();
    const delivered = orders.filter((order) => order.status === "delivered");
    const gmv = sum(delivered.map((order) => order.amount));

    return {
      gmv,
      netRevenue: gmv,
      platformFees: Math.round(gmv * 0.08 * 100) / 100,
      refunds: 0,
      promoCosts: 0,
      commissions: 0
    };
  },

  async listRefunds(filters: FinanceFilters): Promise<PaginatedResponse<Refund>> {
    return paginate([], filters.page, filters.pageSize);
  },

  async listPayouts(filters: FinanceFilters): Promise<PaginatedResponse<Payout>> {
    return paginate([], filters.page, filters.pageSize);
  },

  async listNotifications() {
    const notifications = await getNotifications();
    return notifications.map((notification) => ({
      id: String(notification.id),
      type: "order" as const,
      title: titleCase(notification.type),
      body: notification.message,
      severity: notification.read_at ? ("low" as const) : ("medium" as const),
      createdAt: normalizeDate(notification.created_at),
      read: Boolean(notification.read_at)
    }));
  },

  async getAnalytics(): Promise<AnalyticsSnapshot> {
    const [orders, couriers, stores] = await Promise.all([getOrders(), this.listCouriers(), this.listStores()]);
    const buckets = hourlyBuckets(orders);
    const delivered = orders.filter((order) => order.status === "delivered");

    return {
      orders: buckets.map(({ label, value }) => ({ label, value })),
      deliveryPerformance: [
        { label: "Pending", value: orders.filter((order) => order.status === "pending").length },
        { label: "Accepted", value: orders.filter((order) => order.status === "accepted").length },
        { label: "Picked up", value: orders.filter((order) => order.status === "picked_up").length },
        { label: "Delivered", value: delivered.length }
      ],
      storePerformance: stores.map((store) => ({ label: store.name, value: orders.filter((order) => order.storeId === store.id).length })),
      courierPerformance: couriers.map((courier) => ({ label: courier.name, value: courier.completedDeliveries })),
      customerRetention: [
        { label: "Customers", value: uniqueById(orders.map((order) => order.customer)).length },
        { label: "Repeat", value: uniqueById(orders.filter((order) => orders.filter((candidate) => candidate.customerId === order.customerId).length > 1).map((order) => order.customer)).length }
      ],
      cancellationsRefunds: []
    };
  },

  async listPromotions() {
    return [];
  },

  savePromotion: unsupported,

  async listAdminUsers(): Promise<AdminUser[]> {
    const response = await httpClient.get<{ user: BackendUser }>("/auth/me");
    return [
      {
        id: String(response.user.id),
        name: response.user.name,
        email: response.user.email,
        role: "super_admin",
        permissions: rolePermissions.super_admin,
        status: "active",
        lastActiveAt: normalizeDate(response.user.updated_at ?? response.user.created_at),
        workspaceScope: "global"
      }
    ];
  },

  async listAuditLogs(): Promise<AuditLog[]> {
    const logs = await getLogs();
    return logs.map(mapActivityLog);
  }
};
