export type DeliveryMode = "delivery" | "pickup";
export type AppRole = "customer" | "driver" | "admin" | "owner";
export type DeliveryStatus = "pending" | "accepted" | "picked_up" | "delivered";

export type OrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "on_the_way"
  | "delivered";

export type ImageTheme =
  | "saffron"
  | "ember"
  | "mint"
  | "coast"
  | "berry"
  | "night";

export interface Address {
  id: string;
  label: string;
  line1: string;
  city: string;
  instructions?: string;
  latitude?: number;
  longitude?: number;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  favoriteCuisine: string[];
  defaultAddressId: string;
  role?: AppRole;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt?: string;
}

export interface MenuOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface MenuOptionGroup {
  id: string;
  name: string;
  required?: boolean;
  multiSelect?: boolean;
  options: MenuOption[];
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  sectionId: string;
  name: string;
  description: string;
  price: number;
  tags: string[];
  calories?: number;
  popular?: boolean;
  imageTheme?: ImageTheme;
  optionGroups?: MenuOptionGroup[];
}

export interface MenuSection {
  id: string;
  title: string;
  description: string;
  items: MenuItem[];
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  body: string;
}

export interface TimelineEvent {
  id: string;
  label: string;
  timestamp: string;
  note?: string;
  complete: boolean;
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  cuisines: string[];
  rating: number;
  reviewCount: number;
  etaMin: number;
  etaMax: number;
  deliveryFee: number;
  minimumOrder: number;
  priceLevel: "$" | "$$" | "$$$";
  tags: string[];
  heroTagline: string;
  imageTheme: ImageTheme;
  address: string;
  distanceMiles: number;
  isFeatured?: boolean;
  supportsPickup?: boolean;
  coordinates: {
    lat: number;
    lng: number;
  };
  openingHours: string[];
  infoBullets: string[];
  menuSections: MenuSection[];
  reviews: Review[];
}

export interface CartSelection {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
}

export interface CartItem {
  id: string;
  restaurantId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selectedOptions: CartSelection[];
  notes?: string;
  imageTheme?: ImageTheme;
}

export interface Order {
  id: string;
  restaurantId: string;
  restaurantName: string;
  status: OrderStatus;
  placedAt: string;
  etaMinutes: number;
  total: number;
  itemsSummary: string[];
  deliveryMode: DeliveryMode;
  address: Address;
  paymentLabel: string;
  timeline: TimelineEvent[];
}

export interface DeliveryActor {
  id: number;
  name: string;
  email: string;
  role: AppRole;
}

export interface DeliveryRecord {
  id: number;
  customerId: number;
  customer?: DeliveryActor;
  driverId?: number;
  driver?: DeliveryActor;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedDistanceKm: number;
  price: number;
  priceDisplay: string;
  status: DeliveryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryTrackingPoint {
  id: number;
  deliveryId: number;
  latitude: number;
  longitude: number;
  progress: number;
  createdAt: string;
}

export interface TrackingSnapshot {
  deliveryId: number;
  status: DeliveryStatus;
  currentLatitude: number;
  currentLongitude: number;
  progress: number;
  estimatedEtaSeconds: number;
  remainingDistanceKm: number;
  points: DeliveryTrackingPoint[];
}

export interface DeliveryStatusHistoryItem {
  id: number;
  deliveryId: number;
  status: DeliveryStatus;
  note?: string;
  createdAt: string;
  changedBy?: DeliveryActor;
}

export interface NotificationItem {
  id: number;
  type: string;
  message: string;
  payload: string;
  readAt?: string | null;
  createdAt: string;
}

export interface AdminMetrics {
  totalUsers: number;
  totalCustomers: number;
  totalDrivers: number;
  totalAdmins: number;
  totalDeliveries: number;
  pendingDeliveries: number;
  activeDeliveries: number;
  completedDeliveries: number;
  totalRevenue: number;
  totalRevenueDisplay: string;
  unreadNotifications: number;
}

export interface AdminDashboard {
  generatedAt: string;
  metrics: AdminMetrics;
  recentDeliveries: DeliveryRecord[];
}

export interface AdminDriverSummary {
  id: number;
  name: string;
  email: string;
  activeDeliveries: number;
  completedDeliveries: number;
}

export interface AdminActivityLogItem {
  id: number;
  deliveryId: number;
  status: DeliveryStatus;
  note?: string;
  createdAt: string;
  changedBy?: DeliveryActor;
  delivery?: DeliveryRecord;
}

export interface RestaurantFilters {
  search?: string;
  cuisines?: string[];
  sort?:
    | "recommended"
    | "fastest"
    | "top-rated"
    | "delivery-fee"
    | "minimum-order";
  deliveryMode?: DeliveryMode;
  maxDeliveryFee?: number;
}

export interface CategoryChip {
  id: string;
  name: string;
  description: string;
}

export interface PromoBanner {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  ctaLabel: string;
  imageTheme: ImageTheme;
}

export interface CheckoutPayload {
  items: CartItem[];
  deliveryMode: DeliveryMode;
  promoCode?: string;
  notes?: string;
  addressId?: string;
  deliveryAddress?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegistrationCodeRequestPayload {
  fullName: string;
  email: string;
  password: string;
  role: AppRole;
}

export interface RegistrationCodeRequestResult {
  message: string;
  expiresAt?: string;
  verificationCode?: string;
}

export interface RegisterPayload {
  email: string;
  code: string;
}

export interface CheckoutResult {
  orderId: string;
  status: OrderStatus;
}
