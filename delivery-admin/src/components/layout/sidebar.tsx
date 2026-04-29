import { NavLink } from "react-router-dom";
import { Package2, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { navigationItems } from "@/constants/navigation";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";

export function Sidebar() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const mobileSidebarOpen = useUiStore((state) => state.mobileSidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const setMobileSidebarOpen = useUiStore((state) => state.setMobileSidebarOpen);

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 lg:sticky",
          sidebarOpen ? "w-72" : "w-20",
          "hidden lg:flex"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <div className={cn("flex items-center gap-3 overflow-hidden", !sidebarOpen && "justify-center")}>
            <div className="rounded-xl bg-white/10 p-2">
              <Package2 className="h-5 w-5" />
            </div>
            {sidebarOpen ? (
              <div>
                <p className="text-sm font-semibold">{env.appName}</p>
                <p className="text-xs text-sidebar-foreground/70">Operations console</p>
              </div>
            ) : null}
          </div>
          <button className="rounded-lg p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={toggleSidebar} type="button">
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigationItems
            .filter((item) => hasPermission(item.permission))
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                      isActive ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                      !sidebarOpen && "justify-center"
                    )
                  }
                  to={item.to}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {sidebarOpen ? <span>{item.label}</span> : null}
                </NavLink>
              );
            })}
        </nav>

        {currentUser ? (
          <div className="border-t border-sidebar-border p-4">
            <div className={cn("rounded-2xl bg-white/5 p-3", !sidebarOpen && "px-2")}>
              <p className="truncate text-sm font-medium">{currentUser.name}</p>
              {sidebarOpen ? <p className="truncate text-xs text-sidebar-foreground/70">{currentUser.email}</p> : null}
            </div>
          </div>
        ) : null}
      </aside>

      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-border p-2" onClick={() => setMobileSidebarOpen(true)} type="button">
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">{env.appName}</span>
        </div>
      </div>

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-30 bg-foreground/50 lg:hidden" onClick={() => setMobileSidebarOpen(false)}>
          <aside className="h-full w-72 border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-2">
                  <Package2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{env.appName}</p>
                  <p className="text-xs text-sidebar-foreground/70">Operations console</p>
                </div>
              </div>
              <button className="rounded-lg p-2 hover:bg-sidebar-accent" onClick={() => setMobileSidebarOpen(false)} type="button">
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <nav className="space-y-1">
              {navigationItems
                .filter((item) => hasPermission(item.permission))
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                          isActive ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                        )
                      }
                      onClick={() => setMobileSidebarOpen(false)}
                      to={item.to}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
