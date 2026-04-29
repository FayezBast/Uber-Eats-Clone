import { type AdminRole, type Permission } from "@/types";

export const roleLabels: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  operations_manager: "Operations Manager",
  dispatcher: "Dispatcher",
  support_agent: "Support Agent",
  finance_admin: "Finance Admin",
  store_success_manager: "Store Success Manager"
};

export const rolePermissions: Record<AdminRole, Permission[]> = {
  super_admin: [
    "dashboard:view",
    "orders:view",
    "orders:assign",
    "orders:refund",
    "orders:cancel",
    "dispatch:view",
    "dispatch:manage",
    "stores:view",
    "stores:update",
    "couriers:view",
    "couriers:update",
    "customers:view",
    "customers:update",
    "support:view",
    "support:manage",
    "finance:view",
    "promotions:view",
    "promotions:manage",
    "analytics:view",
    "settings:view",
    "settings:manage"
  ],
  operations_manager: [
    "dashboard:view",
    "orders:view",
    "orders:assign",
    "orders:cancel",
    "dispatch:view",
    "dispatch:manage",
    "stores:view",
    "stores:update",
    "couriers:view",
    "couriers:update",
    "customers:view",
    "support:view",
    "support:manage",
    "analytics:view"
  ],
  dispatcher: [
    "dashboard:view",
    "orders:view",
    "orders:assign",
    "dispatch:view",
    "dispatch:manage",
    "couriers:view",
    "support:view"
  ],
  support_agent: [
    "dashboard:view",
    "orders:view",
    "customers:view",
    "customers:update",
    "support:view",
    "support:manage"
  ],
  finance_admin: [
    "dashboard:view",
    "orders:view",
    "orders:refund",
    "finance:view",
    "analytics:view",
    "settings:view"
  ],
  store_success_manager: [
    "dashboard:view",
    "orders:view",
    "stores:view",
    "stores:update",
    "support:view",
    "analytics:view"
  ]
};
