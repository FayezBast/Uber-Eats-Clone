import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/app/layouts/app-shell";
import { AnalyticsPage } from "@/app/pages/analytics-page";
import { CourierDetailPage } from "@/app/pages/courier-detail-page";
import { CouriersPage } from "@/app/pages/couriers-page";
import { CustomerDetailPage } from "@/app/pages/customer-detail-page";
import { CustomersPage } from "@/app/pages/customers-page";
import { DispatchPage } from "@/app/pages/dispatch-page";
import { FinancePage } from "@/app/pages/finance-page";
import { NotFoundPage } from "@/app/pages/not-found-page";
import { OrdersPage } from "@/app/pages/orders-page";
import { OverviewPage } from "@/app/pages/overview-page";
import { PromotionsPage } from "@/app/pages/promotions-page";
import { RouteErrorPage } from "@/app/pages/route-error-page";
import { SettingsPage } from "@/app/pages/settings-page";
import { StoreDetailPage } from "@/app/pages/store-detail-page";
import { StoresPage } from "@/app/pages/stores-page";
import { SupportDetailPage } from "@/app/pages/support-detail-page";
import { SupportPage } from "@/app/pages/support-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "dispatch", element: <DispatchPage /> },
      { path: "stores", element: <StoresPage /> },
      { path: "stores/:storeId", element: <StoreDetailPage /> },
      { path: "couriers", element: <CouriersPage /> },
      { path: "couriers/:courierId", element: <CourierDetailPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "customers/:customerId", element: <CustomerDetailPage /> },
      { path: "support", element: <SupportPage /> },
      { path: "support/:ticketId", element: <SupportDetailPage /> },
      { path: "finance", element: <FinancePage /> },
      { path: "promotions", element: <PromotionsPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "settings", element: <SettingsPage /> }
    ]
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
]);
