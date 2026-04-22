"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, MapPin, PackageCheck, Truck } from "lucide-react";

import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { SkeletonCard } from "@/components/states/skeleton-card";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDistanceKm, formatOrderTime, formatStatusLabel } from "@/lib/format";
import { apiClient } from "@/services/api/client";
import { type DeliveryRecord, type DeliveryStatus } from "@/types";

const nextStatusMap: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  accepted: "picked_up",
  picked_up: "delivered"
};

export default function DriverPage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const [available, setAvailable] = useState<DeliveryRecord[]>([]);
  const [assigned, setAssigned] = useState<DeliveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [nextAvailable, nextAssigned] = await Promise.all([
        apiClient.getDriverAvailableDeliveries(),
        apiClient.getDriverAssignedDeliveries()
      ]);
      setAvailable(nextAvailable);
      setAssigned(nextAssigned);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load driver deliveries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!user || user.role !== "driver") {
      setLoading(false);
      return;
    }

    void loadData();
  }, [hydrated, user]);

  const activeAssigned = useMemo(
    () => assigned.filter((delivery) => delivery.status !== "delivered"),
    [assigned]
  );

  if (!hydrated) {
    return (
      <div className="container grid gap-5 py-8 sm:py-10">
        <SkeletonCard className="h-[220px]" />
        <SkeletonCard className="h-[260px]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-10">
        <EmptyState
          title="Sign in as a driver"
          description="The driver workspace pulls assigned and available deliveries from your authenticated backend account."
          action={
            <Button asChild>
              <Link href="/auth/driver/sign-in">Sign in</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (user.role !== "driver") {
    return (
      <div className="container py-10">
        <EmptyState
          title="Driver access required"
          description="This page is reserved for driver accounts. Customer, restaurant owner, and admin roles have their own workspaces."
          action={
            <Button asChild variant="outline">
              <Link
                href={
                  user.role === "admin" ? "/admin" : user.role === "owner" ? "/owner" : "/orders"
                }
              >
                Open your workspace
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container space-y-8 py-8 sm:py-10">
      <section className="section-shell p-6 sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Badge className="w-fit gap-2">
              <Truck className="h-3.5 w-3.5" />
              Driver workspace
            </Badge>
            <h1 className="balance-text font-display text-5xl text-foreground sm:text-6xl">
              Accept runs and move deliveries through the route.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Available jobs come from `/driver/deliveries/available`, and assigned jobs update live against the driver endpoints.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-pill min-w-[150px]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Available</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{available.length}</p>
            </div>
            <div className="stat-pill min-w-[150px]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Assigned</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{activeAssigned.length}</p>
            </div>
            <div className="stat-pill min-w-[150px]">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Completed</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {assigned.filter((delivery) => delivery.status === "delivered").length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {error ? <ErrorState description={error} /> : null}

      {loading ? (
        <div className="grid gap-5">
          <SkeletonCard className="h-[260px]" />
          <SkeletonCard className="h-[260px]" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-4">
            <h2 className="font-display text-3xl">Available deliveries</h2>
            {available.length ? (
              <div className="grid gap-4">
                {available.map((delivery) => (
                  <Card key={delivery.id} className="overflow-hidden bg-white/85">
                    <CardHeader className="border-b border-border/70 bg-surface/35">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-2xl">Delivery #{delivery.id}</CardTitle>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Created {formatOrderTime(delivery.createdAt)}
                          </p>
                        </div>
                        <Badge variant="outline">{formatStatusLabel(delivery.status)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="frost-panel p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pickup</p>
                          <p className="mt-2 text-sm font-semibold text-foreground">{delivery.pickupAddress}</p>
                        </div>
                        <div className="frost-panel p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Drop-off</p>
                          <p className="mt-2 text-sm font-semibold text-foreground">{delivery.dropoffAddress}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="stat-pill">{formatDistanceKm(delivery.estimatedDistanceKm)}</span>
                        <span className="stat-pill">{delivery.priceDisplay || formatCurrency(delivery.price)}</span>
                        {delivery.customer ? <span className="stat-pill">{delivery.customer.name}</span> : null}
                      </div>
                      <Button
                        className="w-full"
                        disabled={busyId === delivery.id}
                        onClick={async () => {
                          setBusyId(delivery.id);
                          try {
                            await apiClient.acceptDriverDelivery(delivery.id);
                            await loadData();
                          } finally {
                            setBusyId(null);
                          }
                        }}
                      >
                        <PackageCheck className="h-4 w-4" />
                        {busyId === delivery.id ? "Accepting..." : "Accept delivery"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No open runs right now"
                description="When customers place orders, pending deliveries will appear here for drivers to accept."
              />
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-3xl">Assigned deliveries</h2>
            {assigned.length ? (
              <div className="grid gap-4">
                {assigned.map((delivery) => {
                  const nextStatus = nextStatusMap[delivery.status];

                  return (
                    <Card key={delivery.id} className="overflow-hidden bg-white/85">
                      <CardHeader className="border-b border-border/70 bg-surface/35">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-2xl">Delivery #{delivery.id}</CardTitle>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Updated {formatOrderTime(delivery.updatedAt)}
                            </p>
                          </div>
                          <Badge>{formatStatusLabel(delivery.status)}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-6">
                        <div className="frost-panel flex items-start gap-3 p-4">
                          <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                          <div className="text-sm">
                            <p className="font-semibold text-foreground">{delivery.pickupAddress}</p>
                            <p className="mt-1 text-muted-foreground">{delivery.dropoffAddress}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="stat-pill">{formatDistanceKm(delivery.estimatedDistanceKm)}</span>
                          <span className="stat-pill">{delivery.priceDisplay || formatCurrency(delivery.price)}</span>
                          {delivery.customer ? <span className="stat-pill">{delivery.customer.name}</span> : null}
                        </div>
                        {nextStatus ? (
                          <Button
                            className="w-full"
                            disabled={busyId === delivery.id}
                            onClick={async () => {
                              setBusyId(delivery.id);
                              try {
                                await apiClient.updateDriverDeliveryStatus(delivery.id, nextStatus);
                                await loadData();
                              } finally {
                                setBusyId(null);
                              }
                            }}
                          >
                            {busyId === delivery.id
                              ? "Updating..."
                              : nextStatus === "picked_up"
                                ? "Mark picked up"
                                : "Mark delivered"}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <div className="frost-panel p-4 text-sm text-muted-foreground">
                            This delivery is complete.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No assigned deliveries yet"
                description="Accept one of the open runs to start working through the delivery queue."
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
