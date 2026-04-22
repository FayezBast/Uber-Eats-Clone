"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock3, Sparkles } from "lucide-react";

import { OrderTracker } from "@/components/orders/order-tracker";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { SkeletonCard } from "@/components/states/skeleton-card";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatOrderTime } from "@/lib/format";
import { apiClient } from "@/services/api/client";
import { type Order } from "@/types";

export default function OrdersPage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!user) {
      setOrders([]);
      setLoading(false);
      setError("");
      return;
    }

    if (user.role !== "customer" && user.role !== "admin") {
      setOrders([]);
      setLoading(false);
      setError("");
      return;
    }

    let mounted = true;
    setLoading(true);
    setError("");

    apiClient
      .getOrders()
      .then((data) => {
        if (mounted) {
          setOrders(data);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load orders.");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [hydrated, user]);

  const activeOrder = orders.find((order) => order.status !== "delivered");
  const pastOrders = orders.filter((order) => order.status === "delivered");
  const totalSpend = pastOrders.reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="container space-y-8 py-8 sm:py-10">
      <section className="section-shell p-6 sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Orders
            </Badge>
            <h1 className="balance-text font-display text-5xl text-foreground sm:text-6xl">
              Track what’s on the way and reorder what worked.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Active delivery states, timeline detail, and a reusable history rail keep recent orders easy to revisit.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-pill min-w-[150px]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Active</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{activeOrder ? 1 : 0}</p>
            </div>
            <div className="stat-pill min-w-[150px]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Delivered</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{pastOrders.length}</p>
            </div>
            <div className="stat-pill min-w-[150px]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Past spend</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{formatCurrency(totalSpend)}</p>
            </div>
          </div>
        </div>
      </section>

      {!hydrated ? (
        <div className="grid gap-5">
          <SkeletonCard className="h-[420px]" />
          <SkeletonCard className="h-[220px]" />
        </div>
      ) : !user ? (
        <EmptyState
          title="Sign in to see your orders"
          description="Order history, tracking, and reorder links come from your authenticated backend session."
          action={
            <Button asChild>
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
          }
        />
      ) : user.role !== "customer" && user.role !== "admin" ? (
        <EmptyState
          title="Orders are for customer accounts"
          description="Use a customer login to view food orders. Driver, restaurant owner, and admin roles have their own workspaces."
          action={
            <Button asChild variant="outline">
              <Link
                href={
                  user.role === "driver" ? "/driver" : user.role === "owner" ? "/owner" : "/admin"
                }
              >
                Open your workspace
              </Link>
            </Button>
          }
        />
      ) : error ? (
        <ErrorState description={error} />
      ) : loading ? (
        <div className="grid gap-5">
          <SkeletonCard className="h-[420px]" />
          <SkeletonCard className="h-[220px]" />
        </div>
      ) : (
        <>
          {activeOrder ? (
            <div className="space-y-4">
              <h2 className="font-display text-3xl">Active order</h2>
              <OrderTracker order={activeOrder} />
            </div>
          ) : (
            <Card className="bg-white/82">
              <CardContent className="flex items-start gap-3 p-6 text-sm text-muted-foreground">
                <Clock3 className="mt-0.5 h-4 w-4 text-primary" />
                <p>No active order right now. Delivered orders stay below so you can reorder without restarting discovery.</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h2 className="font-display text-3xl">Past orders</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {pastOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden bg-white/85">
                  <CardHeader className="border-b border-border/70 bg-surface/35">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-2xl">{order.restaurantName}</CardTitle>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {formatOrderTime(order.placedAt)} • {formatCurrency(order.total)}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {order.deliveryMode}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div className="frost-panel space-y-2 p-4 text-sm text-muted-foreground">
                      {order.itemsSummary.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                    <Button asChild variant="outline">
                      <Link href={`/restaurants/${order.restaurantId}`}>Reorder</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
