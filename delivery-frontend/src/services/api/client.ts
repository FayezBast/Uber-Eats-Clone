import { readStoredAuthToken } from "@/lib/auth-storage";
import { addresses, categoryChips, currentUser, orders, promoBanners, restaurants } from "@/mocks/data";
import {
  type AdminActivityLogItem,
  type AdminDashboard,
  type AdminDriverSummary,
  type Address,
  type AppRole,
  type AuthSession,
  type AuthUser,
  type CheckoutPayload,
  type CheckoutResult,
  type DeliveryActor,
  type DeliveryTrackingPoint,
  type DeliveryRecord,
  type DeliveryStatusHistoryItem,
  type DeliveryStatus,
  type LoginPayload,
  type NotificationItem,
  type Order,
  type OrderStatus,
  type RegisterPayload,
  type RegistrationCodeRequestPayload,
  type RegistrationCodeRequestResult,
  type Restaurant,
  type RestaurantFilters,
  type TrackingSnapshot
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1";
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveMockRoleFromEmail(email: string): AppRole {
  const normalized = email.trim().toLowerCase();

  if (
    normalized.includes("owner") ||
    normalized.includes("merchant") ||
    normalized.includes("partner") ||
    normalized.includes("restaurant")
  ) {
    return "owner";
  }

  if (normalized.includes("admin")) {
    return "admin";
  }

  if (normalized.includes("driver") || normalized.includes("courier")) {
    return "driver";
  }

  return "customer";
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface BackendRestaurant {
  slug: string;
  name: string;
  cuisine: string;
  price_level: "$" | "$$" | "$$$";
  rating: number;
  review_count: number;
  delivery_minutes: number;
  delivery_fee_cents: number;
  address: string;
  hero_color: string;
  hero_image: string;
  headline: string;
  badges: string[];
  categories: string[];
  menu_sections: BackendMenuSection[];
}

interface BackendMenuSection {
  id: string;
  name: string;
  items: BackendMenuItem[];
}

interface BackendMenuItem {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  popular: boolean;
  tags: string[];
  calories_estimate: number;
  image: string;
}

interface BackendRestaurantListResponse {
  count: number;
  restaurants: BackendRestaurant[];
}

interface BackendRestaurantResponse {
  restaurant: BackendRestaurant;
}

interface BackendUserResponse {
  id: number;
  name: string;
  email: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

interface BackendAuthResponse {
  token: string;
  expires_at?: string;
  user: BackendUserResponse;
}

interface BackendRegistrationCodeResponse {
  message: string;
  expires_at?: string;
  verification_code?: string;
}

interface BackendMeResponse {
  user: BackendUserResponse;
}

interface BackendDeliveryActor {
  id: number;
  name: string;
  email: string;
  role: AppRole;
}

interface BackendDelivery {
  id: number;
  customer_id: number;
  customer?: BackendDeliveryActor;
  driver_id?: number;
  driver?: BackendDeliveryActor;
  pickup_address: string;
  dropoff_address: string;
  estimated_distance_km: number;
  price_cents: number;
  price_display: string;
  status: DeliveryStatus;
  created_at: string;
  updated_at: string;
}

interface BackendDeliveryListResponse {
  count: number;
  deliveries: BackendDelivery[];
}

interface BackendOrderItem {
  id: number;
  menu_item_id: string;
  menu_section_name: string;
  name: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
}

interface BackendDeliveryHistory {
  id: number;
  status: DeliveryStatus;
  note?: string;
  created_at: string;
}

interface BackendTrackingSnapshot {
  delivery_id: number;
  status: DeliveryStatus;
  current_latitude: number;
  current_longitude: number;
  progress: number;
  estimated_eta_seconds: number;
  remaining_distance_km: number;
  points: BackendTrackingPoint[];
}

interface BackendTrackingPoint {
  id: number;
  delivery_id: number;
  latitude: number;
  longitude: number;
  progress: number;
  created_at: string;
}

interface BackendOrderResponse {
  id: number;
  restaurant_slug: string;
  restaurant_name: string;
  restaurant_cuisine: string;
  restaurant_image: string;
  restaurant_address: string;
  delivery_address: string;
  delivery_notes: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  service_fee_cents: number;
  total_cents: number;
  status: string;
  status_label: string;
  items: BackendOrderItem[];
  delivery?: BackendDelivery;
  tracking?: BackendTrackingSnapshot;
  history?: BackendDeliveryHistory[];
  created_at: string;
  updated_at: string;
}

interface BackendOrderListResponse {
  count: number;
  orders: BackendOrderResponse[];
}

interface BackendCreateOrderResponse {
  message: string;
  order: BackendOrderResponse;
}

interface BackendAdminDashboard {
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

interface BackendAdminActivityLogItem {
  id: number;
  delivery_id: number;
  status: DeliveryStatus;
  note?: string;
  created_at: string;
  changed_by?: BackendDeliveryActor;
  delivery?: BackendDelivery;
}

interface BackendAdminLogsResponse {
  count: number;
  logs: BackendAdminActivityLogItem[];
}

interface BackendAdminDriversResponse {
  count: number;
  drivers: Array<{
    id: number;
    name: string;
    email: string;
    active_deliveries: number;
    completed_deliveries: number;
  }>;
}

interface BackendNotificationsResponse {
  count: number;
  notifications: Array<{
    id: number;
    type: string;
    message: string;
    payload: string;
    read_at?: string | null;
    created_at: string;
  }>;
}

interface BackendDeliveryStatusHistoryItem {
  id: number;
  delivery_id: number;
  status: DeliveryStatus;
  note?: string;
  created_at: string;
  changed_by_user?: BackendDeliveryActor;
}

interface BackendDeliveryStatusHistoryResponse {
  count: number;
  history: BackendDeliveryStatusHistoryItem[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const hasBody = init?.body !== undefined && init.body !== null;

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = readStoredAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store"
    });
  } catch {
    throw new ApiError("Unable to reach the backend service.", 503);
  }

  if (!response.ok) {
    let message = `Request failed for ${path} (${response.status})`;

    try {
      const payload = (await response.json()) as { error?: string; message?: string };
      message = payload.error ?? payload.message ?? message;
    } catch {
      // Ignore JSON parsing errors and keep the generic message.
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function includesAny(source: string[], target: string[]) {
  if (!target.length) {
    return true;
  }

  return target.some((value) =>
    source.map((entry) => entry.toLowerCase()).includes(value.toLowerCase())
  );
}

function sortRestaurants(items: Restaurant[], sort: RestaurantFilters["sort"]) {
  const next = [...items];

  switch (sort) {
    case "fastest":
      next.sort((a, b) => a.etaMin - b.etaMin);
      break;
    case "top-rated":
      next.sort((a, b) => b.rating - a.rating);
      break;
    case "delivery-fee":
      next.sort((a, b) => a.deliveryFee - b.deliveryFee);
      break;
    case "minimum-order":
      next.sort((a, b) => a.minimumOrder - b.minimumOrder);
      break;
    default:
      next.sort((a, b) => {
        const featuredWeight = Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
        if (featuredWeight !== 0) {
          return featuredWeight;
        }
        return b.rating - a.rating;
      });
  }

  return next;
}

function filterRestaurants(filters: RestaurantFilters = {}, source = restaurants) {
  const search = filters.search?.trim().toLowerCase();
  let result = source.filter((restaurant) => {
    const matchesSearch =
      !search ||
      restaurant.name.toLowerCase().includes(search) ||
      restaurant.shortDescription.toLowerCase().includes(search) ||
      restaurant.cuisines.some((cuisine) => cuisine.toLowerCase().includes(search));
    const matchesCuisine = includesAny(restaurant.cuisines, filters.cuisines ?? []);
    const matchesMode =
      !filters.deliveryMode || filters.deliveryMode === "delivery" || restaurant.supportsPickup;
    const matchesFee =
      typeof filters.maxDeliveryFee !== "number" || restaurant.deliveryFee <= filters.maxDeliveryFee;

    return matchesSearch && matchesCuisine && matchesMode && matchesFee;
  });

  result = sortRestaurants(result, filters.sort);
  return result;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function parseAddress(value: string, label = "Delivery"): Address {
  const parts = value.split(",").map((entry) => entry.trim()).filter(Boolean);

  return {
    id: `${label.toLowerCase().replace(/\s+/g, "-")}-${parts[0] ?? "address"}`,
    label,
    line1: parts[0] ?? value,
    city: parts.slice(1).join(", ") || "Beirut"
  };
}

function themeFromSeed(seed: string) {
  const value = seed.toLowerCase();

  if (/(saffron|mediterranean|mexican|taco)/.test(value)) return "saffron";
  if (/(burger|pizza|fire|char|smash)/.test(value)) return "ember";
  if (/(healthy|salad|mint|green|bowl)/.test(value)) return "mint";
  if (/(dessert|coast|fresh|labneh)/.test(value)) return "coast";
  if (/(berry|sweet|baklava|pink)/.test(value)) return "berry";
  if (/(japanese|neon|night|ramen|tokyo)/.test(value)) return "night";

  return "saffron";
}

function centsToCurrency(value: number) {
  return value / 100;
}

function capitalizeWords(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((entry) => entry[0].toUpperCase() + entry.slice(1))
    .join(" ");
}

function mapBackendUser(user: BackendUserResponse): AuthUser {
  return {
    id: String(user.id),
    fullName: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

function mapAuthSession(response: BackendAuthResponse): AuthSession {
  return {
    token: response.token,
    expiresAt: response.expires_at,
    user: mapBackendUser(response.user)
  };
}

function mapBackendRestaurant(restaurant: BackendRestaurant): Restaurant {
  const cuisines = uniqueStrings([restaurant.cuisine, ...restaurant.categories.slice(0, 2)]);
  const imageTheme = themeFromSeed(
    [restaurant.name, restaurant.cuisine, restaurant.headline, ...restaurant.categories].join(" ")
  );

  return {
    id: restaurant.slug,
    slug: restaurant.slug,
    name: restaurant.name,
    shortDescription: restaurant.headline,
    longDescription: `${restaurant.headline} Delivered from ${restaurant.address}.`,
    cuisines,
    rating: restaurant.rating,
    reviewCount: restaurant.review_count,
    etaMin: Math.max(12, restaurant.delivery_minutes - 4),
    etaMax: restaurant.delivery_minutes + 4,
    deliveryFee: centsToCurrency(restaurant.delivery_fee_cents),
    minimumOrder: 12,
    priceLevel: restaurant.price_level,
    tags: uniqueStrings([...restaurant.badges, ...restaurant.categories.slice(0, 2)]),
    heroTagline: restaurant.headline,
    imageTheme,
    address: restaurant.address,
    distanceMiles: Number((restaurant.delivery_minutes / 18).toFixed(1)),
    isFeatured: restaurant.rating >= 4.7,
    supportsPickup: true,
    coordinates: {
      lat: 33.8938,
      lng: 35.5018
    },
    openingHours: ["Mon-Sun 11:00 AM - 11:00 PM"],
    infoBullets: uniqueStrings([
      `Cuisine focus: ${restaurant.cuisine}`,
      `Popular tags: ${restaurant.badges.join(", ") || "House favorites"}`,
      `Address: ${restaurant.address}`
    ]),
    menuSections: restaurant.menu_sections.map((section) => ({
      id: section.id,
      title: section.name,
      description: `Chef-selected picks from ${section.name.toLowerCase()}.`,
      items: section.items.map((item) => ({
        id: item.id,
        restaurantId: restaurant.slug,
        sectionId: section.id,
        name: item.name,
        description: item.description,
        price: centsToCurrency(item.price_cents),
        tags: item.tags,
        calories: item.calories_estimate || undefined,
        popular: item.popular,
        imageTheme: themeFromSeed([item.name, item.description, ...item.tags].join(" "))
      }))
    })),
    reviews: [
      {
        id: `${restaurant.slug}-review-1`,
        author: "Local regular",
        rating: restaurant.rating,
        date: new Date().toISOString(),
        title: "Consistent and worth reordering",
        body: restaurant.headline
      },
      {
        id: `${restaurant.slug}-review-2`,
        author: "Late-night order",
        rating: Math.max(4, restaurant.rating - 0.2),
        date: new Date(Date.now() - 86400000).toISOString(),
        title: "Strong menu depth",
        body: `Standout picks from ${restaurant.name} with ${restaurant.badges.join(", ").toLowerCase() || "solid house favorites"}.`
      }
    ]
  };
}

function mapOrderStatus(status: string): OrderStatus {
  switch (status) {
    case "confirmed":
      return "placed";
    case "courier_assigned":
      return "accepted";
    case "on_the_way":
      return "on_the_way";
    case "delivered":
      return "delivered";
    default:
      return "placed";
  }
}

function mapDeliveryActor(actor?: BackendDeliveryActor): DeliveryActor | undefined {
  if (!actor) {
    return undefined;
  }

  return {
    id: actor.id,
    name: actor.name,
    email: actor.email,
    role: actor.role
  };
}

function mapDeliveryRecord(delivery: BackendDelivery): DeliveryRecord {
  return {
    id: delivery.id,
    customerId: delivery.customer_id,
    customer: mapDeliveryActor(delivery.customer),
    driverId: delivery.driver_id,
    driver: mapDeliveryActor(delivery.driver),
    pickupAddress: delivery.pickup_address,
    dropoffAddress: delivery.dropoff_address,
    estimatedDistanceKm: delivery.estimated_distance_km,
    price: centsToCurrency(delivery.price_cents),
    priceDisplay: delivery.price_display,
    status: delivery.status,
    createdAt: delivery.created_at,
    updatedAt: delivery.updated_at
  };
}

function mapAdminActivityLogItem(log: BackendAdminActivityLogItem): AdminActivityLogItem {
  return {
    id: log.id,
    deliveryId: log.delivery_id,
    status: log.status,
    note: log.note,
    createdAt: log.created_at,
    changedBy: mapDeliveryActor(log.changed_by),
    delivery: log.delivery ? mapDeliveryRecord(log.delivery) : undefined
  };
}

function mapDeliveryStatusHistoryItem(item: BackendDeliveryStatusHistoryItem): DeliveryStatusHistoryItem {
  return {
    id: item.id,
    deliveryId: item.delivery_id,
    status: item.status,
    note: item.note,
    createdAt: item.created_at,
    changedBy: mapDeliveryActor(item.changed_by_user)
  };
}

function mapTrackingPoint(point: BackendTrackingPoint): DeliveryTrackingPoint {
  return {
    id: point.id,
    deliveryId: point.delivery_id,
    latitude: point.latitude,
    longitude: point.longitude,
    progress: point.progress,
    createdAt: point.created_at
  };
}

function mapTrackingSnapshot(snapshot: BackendTrackingSnapshot): TrackingSnapshot {
  return {
    deliveryId: snapshot.delivery_id,
    status: snapshot.status,
    currentLatitude: snapshot.current_latitude,
    currentLongitude: snapshot.current_longitude,
    progress: snapshot.progress,
    estimatedEtaSeconds: snapshot.estimated_eta_seconds,
    remainingDistanceKm: snapshot.remaining_distance_km,
    points: snapshot.points.map(mapTrackingPoint)
  };
}

function buildOrderTimeline(order: BackendOrderResponse) {
  const historyByStatus = new Map((order.history ?? []).map((entry) => [entry.status, entry]));
  const deliveryStatus = order.delivery?.status ?? "pending";
  const statusRank: Record<DeliveryStatus, number> = {
    pending: 0,
    accepted: 1,
    picked_up: 2,
    delivered: 3
  };

  return [
    { key: "pending" as const, label: "Order confirmed" },
    { key: "accepted" as const, label: "Courier assigned" },
    { key: "picked_up" as const, label: "Picked up from restaurant" },
    { key: "delivered" as const, label: "Delivered" }
  ].map((step) => {
    const event = historyByStatus.get(step.key);
    return {
      id: `${order.id}-${step.key}`,
      label: step.label,
      timestamp: event?.created_at ?? order.updated_at ?? order.created_at,
      note: event?.note,
      complete: statusRank[step.key] <= statusRank[deliveryStatus]
    };
  });
}

function mapBackendOrder(order: BackendOrderResponse): Order {
  return {
    id: String(order.id),
    restaurantId: order.restaurant_slug,
    restaurantName: order.restaurant_name,
    status: mapOrderStatus(order.status),
    placedAt: order.created_at,
    etaMinutes: Math.max(12, Math.ceil((order.tracking?.estimated_eta_seconds ?? 1500) / 60)),
    total: centsToCurrency(order.total_cents),
    itemsSummary: order.items.map((item) => `${item.quantity}x ${item.name}`),
    deliveryMode: "delivery",
    address: parseAddress(order.delivery_address),
    paymentLabel: "Card on file",
    timeline: buildOrderTimeline(order)
  };
}

async function mockGetRestaurants(filters?: RestaurantFilters) {
  await delay();
  return filterRestaurants(filters);
}

async function mockGetRestaurantById(restaurantId: string) {
  await delay(250);
  return (
    restaurants.find(
      (restaurant) => restaurant.id === restaurantId || restaurant.slug === restaurantId
    ) ?? null
  );
}

async function mockGetOrders() {
  await delay();
  return orders;
}

async function withPublicFallback<T>(loader: () => Promise<T>, fallback: () => Promise<T>) {
  if (USE_MOCK_API) {
    return fallback();
  }

  try {
    return await loader();
  } catch {
    return fallback();
  }
}

export const apiClient = {
  async getLandingData() {
    if (USE_MOCK_API) {
      await delay(180);
      return {
        categories: categoryChips,
        promos: promoBanners,
        featuredRestaurants: restaurants.filter((restaurant) => restaurant.isFeatured),
        orderAgain: orders
          .filter((order) => order.status === "delivered")
          .map((order) => restaurants.find((restaurant) => restaurant.id === order.restaurantId))
          .filter(Boolean) as Restaurant[],
        user: currentUser,
        addresses
      };
    }

    return withPublicFallback(
      async () => {
        const data = await request<BackendRestaurantListResponse>("/restaurants");
        const fetchedRestaurants = data.restaurants.map(mapBackendRestaurant);
        let mappedUser = currentUser;

        if (typeof window !== "undefined" && readStoredAuthToken()) {
          try {
            const me = await request<BackendMeResponse>("/auth/me");
            mappedUser = {
              ...currentUser,
              id: String(me.user.id),
              fullName: me.user.name,
              email: me.user.email,
              role: me.user.role
            };
          } catch {
            // Fall back to the local session user data if the account cannot be resolved.
          }
        }

        return {
          categories: categoryChips,
          promos: promoBanners,
          featuredRestaurants: fetchedRestaurants.slice(0, 3),
          orderAgain: fetchedRestaurants.slice(0, 3),
          user: mappedUser,
          addresses
        };
      },
      async () => ({
        categories: categoryChips,
        promos: promoBanners,
        featuredRestaurants: restaurants.filter((restaurant) => restaurant.isFeatured),
        orderAgain: restaurants.slice(0, 3),
        user: currentUser,
        addresses
      })
    );
  },

  async getRestaurants(filters?: RestaurantFilters) {
    if (USE_MOCK_API) {
      return mockGetRestaurants(filters);
    }

    return withPublicFallback(
      async () => {
        const params = new URLSearchParams();
        if (filters?.search) params.set("search", filters.search);
        if (filters?.cuisines?.[0]) params.set("category", filters.cuisines[0]);

        const path = params.toString() ? `/restaurants?${params.toString()}` : "/restaurants";
        const response = await request<BackendRestaurantListResponse>(path);
        return filterRestaurants(filters, response.restaurants.map(mapBackendRestaurant));
      },
      () => mockGetRestaurants(filters)
    );
  },

  async getRestaurantById(restaurantId: string) {
    if (USE_MOCK_API) {
      return mockGetRestaurantById(restaurantId);
    }

    return withPublicFallback(
      async () => {
        const response = await request<BackendRestaurantResponse>(`/restaurants/${restaurantId}`);
        return mapBackendRestaurant(response.restaurant);
      },
      () => mockGetRestaurantById(restaurantId)
    );
  },

  async getCurrentUser() {
    if (USE_MOCK_API || !readStoredAuthToken()) {
      return null;
    }

    const response = await request<BackendMeResponse>("/auth/me");
    return mapBackendUser(response.user);
  },

  async getOrders() {
    if (USE_MOCK_API) {
      return mockGetOrders();
    }

    const response = await request<BackendOrderListResponse>("/orders");
    return response.orders.map(mapBackendOrder);
  },

  async saveCart(payload: CheckoutPayload) {
    if (USE_MOCK_API) {
      await delay(150);
      return { ok: true, cartItems: payload.items.length };
    }

    return { ok: true, cartItems: payload.items.length };
  },

  async checkout(payload: CheckoutPayload): Promise<CheckoutResult> {
    if (USE_MOCK_API) {
      await delay(500);
      return {
        orderId: "preview-checkout-01",
        status: "placed"
      };
    }

    const restaurantSlug = payload.items[0]?.restaurantId;
    if (!restaurantSlug) {
      throw new ApiError("Your cart is empty.", 400);
    }

    const deliveryAddress =
      payload.deliveryAddress ??
      addresses.find((address) => address.id === payload.addressId)?.line1 ??
      "";

    if (!deliveryAddress.trim()) {
      throw new ApiError("A delivery address is required before checkout.", 400);
    }

    const response = await request<BackendCreateOrderResponse>("/orders", {
      method: "POST",
      body: JSON.stringify({
        restaurant_slug: restaurantSlug,
        delivery_address: deliveryAddress,
        delivery_notes: payload.notes ?? "",
        items: payload.items.map((item) => ({
          menu_item_id: item.menuItemId,
          quantity: item.quantity
        }))
      })
    });

    return {
      orderId: String(response.order.id),
      status: mapOrderStatus(response.order.status)
    };
  },

  async login(payload: LoginPayload): Promise<AuthSession> {
    if (USE_MOCK_API) {
      await delay(250);
      return {
        token: "local-session-token",
        user: {
          id: currentUser.id,
          fullName: currentUser.fullName,
          email: payload.email,
          role: resolveMockRoleFromEmail(payload.email)
        }
      };
    }

    const response = await request<BackendAuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    return mapAuthSession(response);
  },

  async requestRegistrationCode(
    payload: RegistrationCodeRequestPayload
  ): Promise<RegistrationCodeRequestResult> {
    if (USE_MOCK_API) {
      await delay(250);
      return {
        message: "verification code sent",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        verificationCode: "123456"
      };
    }

    const response = await request<BackendRegistrationCodeResponse>("/auth/register/request-code", {
      method: "POST",
      body: JSON.stringify({
        name: payload.fullName,
        email: payload.email,
        password: payload.password,
        role: payload.role
      })
    });

    return {
      message: response.message,
      expiresAt: response.expires_at,
      verificationCode: response.verification_code
    };
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    if (USE_MOCK_API) {
      await delay(250);
      return {
        token: "local-register-token",
        user: {
          id: currentUser.id,
          fullName: currentUser.fullName,
          email: payload.email,
          role: "customer"
        }
      };
    }

    const response = await request<BackendAuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
        code: payload.code
      })
    });

    return mapAuthSession(response);
  },

  async getDriverAvailableDeliveries() {
    const response = await request<BackendDeliveryListResponse>("/driver/deliveries/available");
    return response.deliveries.map(mapDeliveryRecord);
  },

  async getDriverAssignedDeliveries() {
    const response = await request<BackendDeliveryListResponse>("/driver/deliveries/assigned");
    return response.deliveries.map(mapDeliveryRecord);
  },

  async acceptDriverDelivery(deliveryId: number) {
    const response = await request<{ delivery: BackendDelivery }>(`/driver/deliveries/${deliveryId}/accept`, {
      method: "PATCH"
    });

    return mapDeliveryRecord(response.delivery);
  },

  async updateDriverDeliveryStatus(deliveryId: number, status: DeliveryStatus) {
    const response = await request<{ delivery: BackendDelivery }>(`/driver/deliveries/${deliveryId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });

    return mapDeliveryRecord(response.delivery);
  },

  async getAdminDashboard(): Promise<AdminDashboard> {
    if (USE_MOCK_API) {
      await delay(180);
      return {
        generatedAt: new Date().toISOString(),
        metrics: {
          totalUsers: 0,
          totalCustomers: 0,
          totalDrivers: 0,
          totalAdmins: 0,
          totalDeliveries: 0,
          pendingDeliveries: 0,
          activeDeliveries: 0,
          completedDeliveries: 0,
          totalRevenue: 0,
          totalRevenueDisplay: "$0.00",
          unreadNotifications: 0
        },
        recentDeliveries: []
      };
    }

    const response = await request<BackendAdminDashboard>("/admin/dashboard");

    return {
      generatedAt: response.generated_at,
      metrics: {
        totalUsers: response.metrics.total_users,
        totalCustomers: response.metrics.total_customers,
        totalDrivers: response.metrics.total_drivers,
        totalAdmins: response.metrics.total_admins,
        totalDeliveries: response.metrics.total_deliveries,
        pendingDeliveries: response.metrics.pending_deliveries,
        activeDeliveries: response.metrics.active_deliveries,
        completedDeliveries: response.metrics.completed_deliveries,
        totalRevenue: centsToCurrency(response.metrics.total_revenue_cents),
        totalRevenueDisplay: response.metrics.total_revenue_display,
        unreadNotifications: response.metrics.unread_notifications
      },
      recentDeliveries: response.recent_deliveries.map(mapDeliveryRecord)
    };
  },

  async getAdminDeliveries(): Promise<DeliveryRecord[]> {
    if (USE_MOCK_API) {
      await delay(180);
      return [];
    }

    const response = await request<BackendDeliveryListResponse>("/admin/deliveries");
    return response.deliveries.map(mapDeliveryRecord);
  },

  async getAdminLogs(): Promise<AdminActivityLogItem[]> {
    if (USE_MOCK_API) {
      await delay(180);
      return [];
    }

    const response = await request<BackendAdminLogsResponse>("/admin/logs");
    return response.logs.map(mapAdminActivityLogItem);
  },

  async getAdminDrivers(): Promise<AdminDriverSummary[]> {
    if (USE_MOCK_API) {
      await delay(180);
      return [];
    }

    const response = await request<BackendAdminDriversResponse>("/admin/drivers");
    return response.drivers.map((driver) => ({
      id: driver.id,
      name: driver.name,
      email: driver.email,
      activeDeliveries: driver.active_deliveries,
      completedDeliveries: driver.completed_deliveries
    }));
  },

  async assignAdminDelivery(deliveryId: number, driverId: number, note?: string) {
    const response = await request<{ delivery: BackendDelivery }>(`/admin/deliveries/${deliveryId}/assign`, {
      method: "PATCH",
      body: JSON.stringify({
        driver_id: driverId,
        note: note?.trim() || undefined
      })
    });

    return mapDeliveryRecord(response.delivery);
  },

  async updateAdminDeliveryStatus(deliveryId: number, status: DeliveryStatus, note?: string) {
    const response = await request<{ delivery: BackendDelivery }>(`/deliveries/${deliveryId}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        note: note?.trim() || undefined
      })
    });

    return mapDeliveryRecord(response.delivery);
  },

  async getNotifications(): Promise<NotificationItem[]> {
    if (USE_MOCK_API) {
      await delay(180);
      return [];
    }

    const response = await request<BackendNotificationsResponse>("/notifications");

    return response.notifications.map((notification) => ({
      id: notification.id,
      type: capitalizeWords(notification.type),
      message: notification.message,
      payload: notification.payload,
      readAt: notification.read_at,
      createdAt: notification.created_at
    }));
  },

  async markNotificationRead(notificationId: number) {
    await request<{ message: string }>(`/notifications/${notificationId}/read`, {
      method: "PATCH"
    });
  },

  async getDeliveryStatusHistory(deliveryId: number): Promise<DeliveryStatusHistoryItem[]> {
    const response = await request<BackendDeliveryStatusHistoryResponse>(
      `/deliveries/${deliveryId}/status-history`
    );

    return response.history.map(mapDeliveryStatusHistoryItem);
  },

  async getDeliveryTracking(deliveryId: number): Promise<TrackingSnapshot> {
    const response = await request<{ tracking: BackendTrackingSnapshot }>(
      `/deliveries/${deliveryId}/tracking`
    );

    return mapTrackingSnapshot(response.tracking);
  }
};
