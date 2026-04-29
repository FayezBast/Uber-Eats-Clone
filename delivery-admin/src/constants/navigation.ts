import {
  Activity,
  BadgeDollarSign,
  ChartNoAxesCombined,
  CircleHelp,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  TicketPercent,
  Truck,
  Users
} from "lucide-react";

import type { Permission } from "@/types";

export interface NavigationItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
}

export const navigationItems: NavigationItem[] = [
  { label: "Overview", to: "/", icon: LayoutDashboard, permission: "dashboard:view" },
  { label: "Orders", to: "/orders", icon: ShoppingBag, permission: "orders:view" },
  { label: "Live Dispatch", to: "/dispatch", icon: Truck, permission: "dispatch:view" },
  { label: "Stores", to: "/stores", icon: Store, permission: "stores:view" },
  { label: "Couriers", to: "/couriers", icon: ShieldCheck, permission: "couriers:view" },
  { label: "Customers", to: "/customers", icon: Users, permission: "customers:view" },
  { label: "Support", to: "/support", icon: CircleHelp, permission: "support:view" },
  { label: "Finance", to: "/finance", icon: BadgeDollarSign, permission: "finance:view" },
  { label: "Promotions", to: "/promotions", icon: TicketPercent, permission: "promotions:view" },
  { label: "Analytics", to: "/analytics", icon: ChartNoAxesCombined, permission: "analytics:view" },
  { label: "Settings", to: "/settings", icon: Settings, permission: "settings:view" }
];

export const workspaceOptions = [
  { value: "global", label: "All Markets" },
  { value: "beirut", label: "Beirut Ops" },
  { value: "dubai", label: "Dubai Ops" },
  { value: "riyadh", label: "Riyadh Ops" }
] as const;
