import { useState } from "react";
import { Bell, LogOut, MoonStar, Search, SunMedium } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { workspaceOptions } from "@/constants/navigation";
import { formatDateTime } from "@/lib/format";
import { notificationsService } from "@/services/notifications-service";
import { queryKeys } from "@/services/query-keys";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";

export function Topbar() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const workspace = useUiStore((state) => state.workspace);
  const setWorkspace = useUiStore((state) => state.setWorkspace);
  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: notificationsService.listNotifications
  });

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <form
          className="relative w-full max-w-xl"
          onSubmit={(event) => {
            event.preventDefault();
            navigate(`/orders?search=${encodeURIComponent(search)}`);
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" onChange={(event) => setSearch(event.target.value)} placeholder="Search orders, customers, stores, couriers" value={search} />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-44">
            <Select onChange={(event) => setWorkspace(event.target.value as typeof workspace)} value={workspace}>
              {workspaceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <Button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            size="sm"
            variant="outline"
          >
            {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
          </Button>
          <div className="relative">
            <Button onClick={() => setNotificationsOpen((value) => !value)} size="sm" variant="outline">
              <Bell className="h-4 w-4" />
            </Button>
            {notificationsOpen ? (
              <Card className="absolute right-0 top-12 z-30 w-[22rem]">
                <CardContent className="space-y-3 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Notifications</p>
                    <p className="text-xs text-muted-foreground">{notificationsQuery.data?.length ?? 0} items</p>
                  </div>
                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {notificationsQuery.data?.map((notification) => (
                      <div key={notification.id} className="rounded-xl border border-border p-3">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
                        <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
          {currentUser ? (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2">
              <Avatar name={currentUser.name} />
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser.role.replace(/_/g, " ")}</p>
              </div>
            </div>
          ) : null}
          <Button
            onClick={() => {
              clearSession();
              navigate("/");
            }}
            size="sm"
            variant="outline"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
