import { Outlet } from "react-router-dom";

import { AdminAuthGate } from "@/components/auth/admin-auth-gate";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell() {
  return (
    <AdminAuthGate>
      <div className="min-h-screen lg:flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar />
          <main className="px-4 pb-8 pt-20 lg:px-8 lg:pt-8">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminAuthGate>
  );
}
