"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CircleDollarSign,
  Clock3,
  Gauge,
  MapPin,
  MapPinned,
  Navigation,
  PackageCheck,
  RefreshCcw,
  Route,
  Sparkles,
  Truck
} from "lucide-react";

import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { SkeletonCard } from "@/components/states/skeleton-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminAppUrl } from "@/lib/admin-url";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatDistanceKm,
  formatEtaSeconds,
  formatOrderTime,
  formatStatusLabel
} from "@/lib/format";
import { apiClient } from "@/services/api/client";
import { useAuthStore } from "@/store/auth-store";
import {
  type DeliveryRecord,
  type DeliveryStatus,
  type DeliveryStatusHistoryItem,
  type TrackingSnapshot
} from "@/types";

type MapPlotPoint = {
  id: string;
  left: number;
  top: number;
  current: boolean;
};

const nextStatusMap: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  accepted: "picked_up",
  picked_up: "delivered"
};

function isSameLocalDay(value: string, reference = new Date()) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function formatShortTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Moments ago";
  }

  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h ago`;
  }

  return `${hours}h ${remainingMinutes}m ago`;
}

function formatCoordinate(value: number) {
  return value.toFixed(5);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getRouteProgress(delivery: DeliveryRecord, tracking: TrackingSnapshot | null) {
  if (tracking) {
    return Math.min(1, Math.max(0, tracking.progress));
  }

  switch (delivery.status) {
    case "accepted":
      return 0.32;
    case "picked_up":
      return 0.78;
    case "delivered":
      return 1;
    default:
      return 0.08;
  }
}

function getRoutePhaseLabel(status: DeliveryStatus) {
  switch (status) {
    case "accepted":
      return "Heading to pickup";
    case "picked_up":
      return "Heading to customer";
    case "delivered":
      return "Route completed";
    default:
      return "Waiting for dispatch";
  }
}

function buildMapPlotPoints(tracking: TrackingSnapshot | null): MapPlotPoint[] {
  if (!tracking) {
    return [];
  }

  const historicalPoints = tracking.points.map((point) => ({
    id: `history-${point.id}`,
    latitude: point.latitude,
    longitude: point.longitude,
    current: false
  }));

  const points = [
    ...historicalPoints,
    {
      id: "current",
      latitude: tracking.currentLatitude,
      longitude: tracking.currentLongitude,
      current: true
    }
  ];

  if (!points.length) {
    return [];
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latSpan = Math.max(maxLat - minLat, 0.002);
  const lngSpan = Math.max(maxLng - minLng, 0.002);

  return points.map((point) => ({
    id: point.id,
    left: Math.min(90, Math.max(10, 10 + ((point.longitude - minLng) / lngSpan) * 80)),
    top: Math.min(90, Math.max(10, 90 - ((point.latitude - minLat) / latSpan) * 80)),
    current: point.current
  }));
}

function getStatusBadgeClasses(status: DeliveryStatus) {
  switch (status) {
    case "accepted":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "picked_up":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "delivered":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/76 p-5 shadow-float backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        <div className="rounded-2xl bg-foreground p-2.5 text-white">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 font-display text-4xl leading-none text-foreground">{value}</p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}

function EarningsChart({ deliveries }: { deliveries: DeliveryRecord[] }) {
  if (!deliveries.length) {
    return (
      <div className="rounded-[26px] border border-dashed border-border/90 bg-surface/45 p-5 text-sm text-muted-foreground">
        Completed drops will land here as the day moves. Each delivered order adds straight to the
        driver payout total.
      </div>
    );
  }

  const points = [...deliveries]
    .sort((left, right) => new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime())
    .slice(-6);
  const maxValue = Math.max(...points.map((delivery) => delivery.price), 1);

  return (
    <div className="space-y-5">
      <div className="grid h-44 grid-cols-6 items-end gap-3">
        {points.map((delivery) => (
          <div key={`earnings-bar-${delivery.id}`} className="flex h-full flex-col justify-end gap-2">
            <div
              className="rounded-t-[20px] bg-[linear-gradient(180deg,rgba(241,136,63,0.92),rgba(245,178,84,0.72))] shadow-[0_18px_38px_-22px_rgba(241,136,63,0.65)]"
              style={{ height: `${Math.max(24, (delivery.price / maxValue) * 100)}%` }}
            />
            <div className="space-y-1 text-center">
              <p className="text-xs font-semibold text-foreground">{formatCurrency(delivery.price)}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {formatShortTime(delivery.updatedAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[24px] border border-border/70 bg-surface/55 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Best drop</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(Math.max(...deliveries.map((delivery) => delivery.price)))}
          </p>
        </div>
        <div className="rounded-[24px] border border-border/70 bg-surface/55 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Average payout
          </p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatCurrency(
              deliveries.reduce((sum, delivery) => sum + delivery.price, 0) / deliveries.length
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function RouteMap({
  delivery,
  tracking
}: {
  delivery: DeliveryRecord;
  tracking: TrackingSnapshot | null;
}) {
  const plotPoints = buildMapPlotPoints(tracking);
  const routePath =
    plotPoints.length > 1
      ? plotPoints
          .map((point, index) => `${index === 0 ? "M" : "L"} ${point.left} ${point.top}`)
          .join(" ")
      : "";

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-slate-900/90 bg-slate-950 shadow-[0_26px_80px_-42px_rgba(15,23,42,0.85)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(14,165,233,0.14),transparent_24%),radial-gradient(circle_at_24%_100%,rgba(34,197,94,0.12),transparent_34%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="absolute inset-y-0 left-[18%] w-px bg-white/8" />
      <div className="absolute inset-y-0 right-[24%] w-px bg-white/8" />
      <div className="absolute inset-x-0 top-[28%] h-px bg-white/8" />
      <div className="absolute inset-x-0 bottom-[22%] h-px bg-white/8" />

      <div className="relative flex items-start justify-between gap-3 p-5 sm:p-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-200">
            <Navigation className="h-3.5 w-3.5" />
            Live route map
          </div>
          <p className="mt-4 text-sm text-slate-300">
            {tracking
              ? "GPS points are plotted from the active tracking feed for this delivery."
              : "Tracking has not started yet. The board stays ready as soon as the driver feed begins moving."}
          </p>
        </div>
        <div className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-300">
          {getRoutePhaseLabel(delivery.status)}
        </div>
      </div>

      <div className="relative h-[320px] px-5 pb-5 sm:px-6 sm:pb-6">
        <svg viewBox="0 0 100 100" className="absolute inset-6 h-[calc(100%-3rem)] w-[calc(100%-3rem)]">
          <path
            d="M 14 78 C 27 66 35 62 49 52 S 73 32 86 22"
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeDasharray="4 6"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
          {routePath ? (
            <path
              d={routePath}
              fill="none"
              stroke="rgba(56,189,248,0.95)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.4"
            />
          ) : null}
        </svg>

        <div className="absolute left-[14%] top-[74%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400 text-slate-950 shadow-[0_0_0_10px_rgba(251,191,36,0.15)]">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="rounded-2xl border border-white/12 bg-slate-950/80 px-3 py-2 text-left backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Pickup</p>
            <p className="mt-1 max-w-[180px] text-xs font-semibold text-white sm:text-sm">
              {delivery.pickupAddress}
            </p>
          </div>
        </div>

        <div className="absolute right-[8%] top-[20%] flex translate-x-1/2 -translate-y-1/2 items-center gap-2">
          <div className="rounded-2xl border border-white/12 bg-slate-950/80 px-3 py-2 text-right backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Drop-off</p>
            <p className="mt-1 max-w-[180px] text-xs font-semibold text-white sm:text-sm">
              {delivery.dropoffAddress}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-400/35 bg-sky-400 text-slate-950 shadow-[0_0_0_10px_rgba(56,189,248,0.16)]">
            <MapPinned className="h-4 w-4" />
          </div>
        </div>

        {plotPoints.map((point) => (
          <div
            key={point.id}
            className="absolute"
            style={{
              left: `${point.left}%`,
              top: `${point.top}%`,
              transform: "translate(-50%, -50%)"
            }}
          >
            <div
              className={cn(
                "rounded-full",
                point.current
                  ? "h-4 w-4 border-4 border-slate-950 bg-sky-300 shadow-[0_0_0_12px_rgba(56,189,248,0.18)]"
                  : "h-2.5 w-2.5 bg-white/55"
              )}
            />
          </div>
        ))}
      </div>

      <div className="relative grid gap-3 border-t border-white/10 bg-slate-950/85 p-5 sm:grid-cols-3 sm:p-6">
        <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Current latitude</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {tracking ? formatCoordinate(tracking.currentLatitude) : "Waiting for feed"}
          </p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Current longitude</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {tracking ? formatCoordinate(tracking.currentLongitude) : "Waiting for feed"}
          </p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Progress</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {formatPercent(getRouteProgress(delivery, tracking))}
          </p>
        </div>
      </div>
    </div>
  );
}

function RouteHistory({ history }: { history: DeliveryStatusHistoryItem[] }) {
  if (!history.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-border/90 bg-surface/45 p-5 text-sm text-muted-foreground">
        Route history will appear here as dispatch or the driver moves the order through accepted,
        picked up, and delivered states.
      </div>
    );
  }

  const sortedHistory = [...history].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedHistory.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-white">
              {index + 1}
            </div>
            {index < sortedHistory.length - 1 ? <div className="mt-2 h-full w-px bg-border/80" /> : null}
          </div>
          <div className="flex-1 rounded-[24px] border border-border/70 bg-surface/45 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">{formatStatusLabel(event.status)}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {formatOrderTime(event.createdAt)}
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {event.note ??
                (event.changedBy
                  ? `${event.changedBy.name} recorded the route transition.`
                  : "Dispatch logged a delivery milestone.")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DriverPage() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const hydrated = useAuthStore((state) => state.hydrated);

  const dataLoadedRef = useRef(false);
  const routeLoadedRef = useRef<number | null>(null);

  const [available, setAvailable] = useState<DeliveryRecord[]>([]);
  const [assigned, setAssigned] = useState<DeliveryRecord[]>([]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(null);
  const [selectedTracking, setSelectedTracking] = useState<TrackingSnapshot | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<DeliveryStatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState("");
  const [routeError, setRouteError] = useState("");
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [dataRefreshTick, setDataRefreshTick] = useState(0);
  const [routeRefreshTick, setRouteRefreshTick] = useState(0);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!user || user.role !== "driver") {
      dataLoadedRef.current = false;
      setAvailable([]);
      setAssigned([]);
      setSelectedDeliveryId(null);
      setSelectedTracking(null);
      setSelectedHistory([]);
      setError("");
      setRouteError("");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let cancelled = false;

    if (dataLoadedRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    async function loadDriverData() {
      try {
        const [nextAvailable, nextAssigned] = await Promise.all([
          apiClient.getDriverAvailableDeliveries(),
          apiClient.getDriverAssignedDeliveries()
        ]);

        if (cancelled) {
          return;
        }

        setAvailable(nextAvailable);
        setAssigned(nextAssigned);
        setLastSyncedAt(new Date().toISOString());
        dataLoadedRef.current = true;
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(err instanceof Error ? err.message : "Unable to load driver deliveries.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadDriverData();

    return () => {
      cancelled = true;
    };
  }, [dataRefreshTick, hydrated, user]);

  useEffect(() => {
    if (!assigned.length) {
      setSelectedDeliveryId(null);
      return;
    }

    if (selectedDeliveryId && assigned.some((delivery) => delivery.id === selectedDeliveryId)) {
      return;
    }

    const firstActiveDelivery = assigned.find((delivery) => delivery.status !== "delivered");
    setSelectedDeliveryId(firstActiveDelivery?.id ?? assigned[0].id);
  }, [assigned, selectedDeliveryId]);

  useEffect(() => {
    if (!hydrated || !user || user.role !== "driver" || selectedDeliveryId === null) {
      routeLoadedRef.current = null;
      setSelectedTracking(null);
      setSelectedHistory([]);
      setRouteError("");
      return;
    }

    let cancelled = false;
    const deliveryId = selectedDeliveryId;
    const isSameRoute = routeLoadedRef.current === selectedDeliveryId;

    if (!isSameRoute) {
      setSelectedTracking(null);
      setSelectedHistory([]);
    }

    setRouteLoading(!isSameRoute);
    setRouteError("");

    async function loadRouteDetails() {
      const [trackingResult, historyResult] = await Promise.allSettled([
        apiClient.getDeliveryTracking(deliveryId),
        apiClient.getDeliveryStatusHistory(deliveryId)
      ]);

      if (cancelled) {
        return;
      }

      if (trackingResult.status === "fulfilled") {
        setSelectedTracking(trackingResult.value);
      } else {
        setSelectedTracking(null);
      }

      if (historyResult.status === "fulfilled") {
        setSelectedHistory(historyResult.value);
      } else {
        setSelectedHistory([]);
      }

      if (trackingResult.status === "rejected" || historyResult.status === "rejected") {
        setRouteError("Some live route data is temporarily unavailable. Core delivery actions still work.");
      }

      routeLoadedRef.current = deliveryId;
      setRouteLoading(false);
    }

    void loadRouteDetails();

    return () => {
      cancelled = true;
    };
  }, [hydrated, routeRefreshTick, selectedDeliveryId, user]);

  useEffect(() => {
    if (!hydrated || !user || user.role !== "driver") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setDataRefreshTick((value) => value + 1);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hydrated, user]);

  const activeAssigned = useMemo(
    () => assigned.filter((delivery) => delivery.status !== "delivered"),
    [assigned]
  );

  const selectedDelivery = useMemo(
    () => assigned.find((delivery) => delivery.id === selectedDeliveryId) ?? null,
    [assigned, selectedDeliveryId]
  );

  useEffect(() => {
    if (!hydrated || !user || user.role !== "driver" || !selectedDelivery) {
      return;
    }

    if (selectedDelivery.status === "delivered") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRouteRefreshTick((value) => value + 1);
    }, 18000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hydrated, selectedDelivery, user]);

  const deliveredToday = useMemo(
    () =>
      assigned.filter(
        (delivery) => delivery.status === "delivered" && isSameLocalDay(delivery.updatedAt)
      ),
    [assigned]
  );

  const earningsToday = useMemo(
    () => deliveredToday.reduce((sum, delivery) => sum + delivery.price, 0),
    [deliveredToday]
  );

  const activePayout = useMemo(
    () => activeAssigned.reduce((sum, delivery) => sum + delivery.price, 0),
    [activeAssigned]
  );

  const totalDistanceToday = useMemo(
    () => deliveredToday.reduce((sum, delivery) => sum + delivery.estimatedDistanceKm, 0),
    [deliveredToday]
  );

  const selectedProgress = selectedDelivery ? getRouteProgress(selectedDelivery, selectedTracking) : 0;
  const selectedNextStatus = selectedDelivery ? nextStatusMap[selectedDelivery.status] : null;
  const routeStatusBusy =
    selectedDelivery && busyActionId === `status-${selectedDelivery.id}` ? true : false;

  if (!hydrated) {
    return (
      <div className="container grid gap-5 py-8 sm:py-10">
        <SkeletonCard className="h-[280px]" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
          <SkeletonCard className="h-[540px]" />
          <SkeletonCard className="h-[540px]" />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <SkeletonCard className="h-[420px]" />
          <SkeletonCard className="h-[420px]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-10">
        <EmptyState
          title="Sign in as a driver"
          description="The driver workspace uses your authenticated backend account to load available runs, route progress, and payout for the day."
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
                  user.role === "admin" ? (token ? getAdminAppUrl({ token, expiresAt, user }) : getAdminAppUrl()) : user.role === "owner" ? "/owner" : "/orders"
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
    <div className="container space-y-6 py-6 sm:space-y-8 sm:py-10">
      <section className="relative overflow-hidden rounded-[34px] border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(248,239,226,0.78))] shadow-[0_30px_80px_-48px_rgba(26,33,52,0.35)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,188,126,0.24),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(112,152,122,0.16),transparent_24%),linear-gradient(110deg,rgba(255,255,255,0.14),transparent_55%)]" />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)] lg:p-8">
          <div className="space-y-4">
            <Badge className="w-fit gap-2">
              <Truck className="h-3.5 w-3.5" />
              Driver operations
            </Badge>
            <div className="space-y-3">
              <h1 className="balance-text max-w-3xl font-display text-5xl leading-none text-foreground sm:text-6xl">
                Know today&apos;s money, claim the next run, and keep the route moving.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Built like a real driver board: today&apos;s payout at the top, open orders ready to
                accept, and a live route panel that follows the active delivery through pickup and
                drop-off.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="stat-pill flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Shift state
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {activeAssigned.length ? "On route" : available.length ? "Ready for next order" : "Standing by"}
                  </p>
                </div>
              </div>
              <div className="stat-pill flex items-center gap-3">
                <RefreshCcw className={cn("h-4 w-4 text-primary", refreshing ? "animate-spin" : "")} />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Last sync</p>
                  <p className="text-sm font-semibold text-foreground">
                    {lastSyncedAt ? formatShortTime(lastSyncedAt) : "Waiting for first load"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-[0_28px_80px_-44px_rgba(15,23,42,0.72)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Today earned</p>
                  <p className="mt-4 font-display text-5xl leading-none">{formatCurrency(earningsToday)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/8 p-3">
                  <CircleDollarSign className="h-5 w-5 text-amber-300" />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-slate-200">
                  {deliveredToday.length} completed today
                </div>
                <div className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-slate-200">
                  {formatDistanceKm(totalDistanceToday)} covered
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-white/75 bg-white/72 p-5 shadow-float backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Active queue
                </p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{activeAssigned.length}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {activeAssigned.length
                    ? `${formatCurrency(activePayout)} still in motion`
                    : "No active drop in progress"}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/75 bg-white/72 p-5 shadow-float backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Open board
                </p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{available.length}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {available.length ? "Open requests ready to accept" : "Waiting for new requests"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative grid gap-4 border-t border-white/65 p-6 sm:grid-cols-2 xl:grid-cols-4 lg:px-8 lg:pb-8">
          <MetricCard
            icon={CircleDollarSign}
            label="Earned today"
            value={formatCurrency(earningsToday)}
            detail={`${deliveredToday.length} delivered jobs have already cleared into today’s total.`}
          />
          <MetricCard
            icon={Route}
            label="Active payout"
            value={formatCurrency(activePayout)}
            detail={
              activeAssigned.length
                ? `${activeAssigned.length} assigned runs are still moving through pickup or drop-off.`
                : "No assigned route is currently active."
            }
          />
          <MetricCard
            icon={Truck}
            label="Open requests"
            value={String(available.length)}
            detail="Claim from the available board below to pull the run into your active queue."
          />
          <MetricCard
            icon={Gauge}
            label="Completed today"
            value={String(deliveredToday.length)}
            detail={
              deliveredToday.length
                ? `${formatDistanceKm(totalDistanceToday)} covered across today’s finished deliveries.`
                : "The board will start counting finished routes as soon as a drop is delivered."
            }
          />
        </div>
      </section>

      {error ? <ErrorState description={error} /> : null}

      {loading ? (
        <div className="grid gap-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
            <SkeletonCard className="h-[620px]" />
            <SkeletonCard className="h-[620px]" />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <SkeletonCard className="h-[460px]" />
            <SkeletonCard className="h-[460px]" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
            <section className="section-shell p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-display text-3xl text-foreground sm:text-4xl">Active route</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Keep one route in focus. This panel shows the selected delivery, its live path,
                    next action, and the core trip details the driver needs.
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={refreshing}
                  onClick={() => {
                    setDataRefreshTick((value) => value + 1);
                    if (selectedDeliveryId !== null) {
                      setRouteRefreshTick((value) => value + 1);
                    }
                  }}
                >
                  <RefreshCcw className={cn("h-4 w-4", refreshing ? "animate-spin" : "")} />
                  Refresh board
                </Button>
              </div>

              {selectedDelivery ? (
                <div className="mt-6 grid gap-5 2xl:grid-cols-[minmax(0,1.18fr)_minmax(300px,0.82fr)]">
                  <RouteMap delivery={selectedDelivery} tracking={selectedTracking} />

                  <Card className="overflow-hidden bg-white/82">
                    <CardHeader className="border-b border-border/70 bg-surface/35">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <CardTitle>Delivery #{selectedDelivery.id}</CardTitle>
                          <CardDescription className="mt-2">
                            {selectedDelivery.customer
                              ? `Delivering for ${selectedDelivery.customer.name}`
                              : "Customer details are attached to this assigned route."}
                          </CardDescription>
                        </div>
                        <div
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                            getStatusBadgeClasses(selectedDelivery.status)
                          )}
                        >
                          {formatStatusLabel(selectedDelivery.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-6">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[22px] border border-border/70 bg-surface/45 p-4">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">ETA</p>
                          <p className="mt-2 text-lg font-semibold text-foreground">
                            {selectedTracking
                              ? formatEtaSeconds(selectedTracking.estimatedEtaSeconds)
                              : "Waiting for GPS"}
                          </p>
                        </div>
                        <div className="rounded-[22px] border border-border/70 bg-surface/45 p-4">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Remaining
                          </p>
                          <p className="mt-2 text-lg font-semibold text-foreground">
                            {selectedTracking
                              ? formatDistanceKm(selectedTracking.remainingDistanceKm)
                              : formatDistanceKm(selectedDelivery.estimatedDistanceKm)}
                          </p>
                        </div>
                        <div className="rounded-[22px] border border-border/70 bg-surface/45 p-4">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Route value
                          </p>
                          <p className="mt-2 text-lg font-semibold text-foreground">
                            {selectedDelivery.priceDisplay || formatCurrency(selectedDelivery.price)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-foreground">
                            {getRoutePhaseLabel(selectedDelivery.status)}
                          </p>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            {formatPercent(selectedProgress)}
                          </p>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-secondary/90">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(241,136,63,0.96),rgba(112,152,122,0.88))]"
                            style={{ width: `${Math.max(8, selectedProgress * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid gap-3">
                        <div className="frost-panel p-4">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Pickup</p>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {selectedDelivery.pickupAddress}
                          </p>
                        </div>
                        <div className="frost-panel p-4">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Drop-off
                          </p>
                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {selectedDelivery.dropoffAddress}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="stat-pill">{formatDistanceKm(selectedDelivery.estimatedDistanceKm)}</span>
                        <span className="stat-pill">Updated {formatRelativeTime(selectedDelivery.updatedAt)}</span>
                        <span className="stat-pill">Created {formatOrderTime(selectedDelivery.createdAt)}</span>
                      </div>

                      {routeError ? (
                        <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                          {routeError}
                        </div>
                      ) : null}

                      {routeLoading ? (
                        <SkeletonCard className="h-[88px]" />
                      ) : selectedNextStatus ? (
                        <Button
                          className="w-full"
                          disabled={routeStatusBusy}
                          onClick={async () => {
                            setBusyActionId(`status-${selectedDelivery.id}`);
                            try {
                              await apiClient.updateDriverDeliveryStatus(
                                selectedDelivery.id,
                                selectedNextStatus
                              );
                              setDataRefreshTick((value) => value + 1);
                              setRouteRefreshTick((value) => value + 1);
                            } finally {
                              setBusyActionId(null);
                            }
                          }}
                        >
                          {routeStatusBusy
                            ? "Updating route..."
                            : selectedNextStatus === "picked_up"
                              ? "Confirm pickup"
                              : "Mark delivered"}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                          This run is complete. Keep it selected for review or move to another assigned route.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="mt-6">
                  <EmptyState
                    title="No active route selected"
                    description="Accept one of the open orders below to bring it into your assigned queue and light up the live route panel."
                  />
                </div>
              )}
            </section>

            <div className="space-y-6">
              <Card className="overflow-hidden bg-white/84">
                <CardHeader className="border-b border-border/70 bg-surface/35">
                  <CardTitle>Today&apos;s payout flow</CardTitle>
                  <CardDescription>
                    Completed deliveries stack into the daily total so the driver can read the shift
                    at a glance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <EarningsChart deliveries={deliveredToday} />
                </CardContent>
              </Card>

              <Card className="overflow-hidden bg-white/84">
                <CardHeader className="border-b border-border/70 bg-surface/35">
                  <CardTitle>Route activity</CardTitle>
                  <CardDescription>
                    Status history for the selected delivery, including dispatch and driver updates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <RouteHistory history={selectedHistory} />
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-3xl text-foreground">Available orders</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Open deliveries waiting to be claimed by a driver.
                  </p>
                </div>
                <div className="stat-pill text-sm font-semibold text-foreground">{available.length}</div>
              </div>

              {available.length ? (
                <div className="grid gap-4">
                  {available.map((delivery) => {
                    const acceptBusy = busyActionId === `accept-${delivery.id}`;

                    return (
                      <Card key={delivery.id} className="overflow-hidden bg-white/85">
                        <CardHeader className="border-b border-border/70 bg-surface/35">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <CardTitle className="text-[1.7rem]">Delivery #{delivery.id}</CardTitle>
                              <CardDescription className="mt-2">
                                Posted {formatRelativeTime(delivery.createdAt)}
                              </CardDescription>
                            </div>
                            <Badge variant="outline">{formatStatusLabel(delivery.status)}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6">
                          <div className="grid gap-3">
                            <div className="frost-panel flex items-start gap-3 p-4">
                              <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                              <div className="text-sm">
                                <p className="font-semibold text-foreground">{delivery.pickupAddress}</p>
                                <p className="mt-1 text-muted-foreground">Pickup</p>
                              </div>
                            </div>
                            <div className="frost-panel flex items-start gap-3 p-4">
                              <MapPinned className="mt-0.5 h-4 w-4 text-primary" />
                              <div className="text-sm">
                                <p className="font-semibold text-foreground">{delivery.dropoffAddress}</p>
                                <p className="mt-1 text-muted-foreground">Drop-off</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="stat-pill">
                              {delivery.priceDisplay || formatCurrency(delivery.price)}
                            </span>
                            <span className="stat-pill">{formatDistanceKm(delivery.estimatedDistanceKm)}</span>
                            {delivery.customer ? (
                              <span className="stat-pill">{delivery.customer.name}</span>
                            ) : null}
                            <span className="stat-pill">{formatShortTime(delivery.createdAt)}</span>
                          </div>

                          <Button
                            className="w-full"
                            disabled={acceptBusy}
                            onClick={async () => {
                              setBusyActionId(`accept-${delivery.id}`);
                              try {
                                const acceptedDelivery = await apiClient.acceptDriverDelivery(delivery.id);
                                setSelectedDeliveryId(acceptedDelivery.id);
                                setDataRefreshTick((value) => value + 1);
                                setRouteRefreshTick((value) => value + 1);
                              } finally {
                                setBusyActionId(null);
                              }
                            }}
                          >
                            <PackageCheck className="h-4 w-4" />
                            {acceptBusy ? "Accepting order..." : "Accept order"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="No open runs right now"
                  description="When customers place new orders, they will appear here for the next available driver."
                />
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-3xl text-foreground">Assigned queue</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Keep an eye on all accepted, in-flight, and completed deliveries.
                  </p>
                </div>
                <div className="stat-pill text-sm font-semibold text-foreground">{assigned.length}</div>
              </div>

              {assigned.length ? (
                <div className="grid gap-4">
                  {assigned.map((delivery) => {
                    const isSelected = delivery.id === selectedDeliveryId;
                    const progress =
                      isSelected && selectedTracking
                        ? getRouteProgress(delivery, selectedTracking)
                        : getRouteProgress(delivery, null);

                    return (
                      <Card
                        key={delivery.id}
                        className={cn(
                          "overflow-hidden bg-white/85 transition-all",
                          isSelected && "border-primary/35 shadow-[0_24px_60px_-38px_rgba(241,136,63,0.55)]"
                        )}
                      >
                        <CardHeader className="border-b border-border/70 bg-surface/35">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <CardTitle className="text-[1.7rem]">Delivery #{delivery.id}</CardTitle>
                              <CardDescription className="mt-2">
                                Updated {formatRelativeTime(delivery.updatedAt)}
                              </CardDescription>
                            </div>
                            <div
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                                getStatusBadgeClasses(delivery.status)
                              )}
                            >
                              {formatStatusLabel(delivery.status)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[22px] border border-border/70 bg-surface/45 p-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                Route value
                              </p>
                              <p className="mt-2 text-lg font-semibold text-foreground">
                                {delivery.priceDisplay || formatCurrency(delivery.price)}
                              </p>
                            </div>
                            <div className="rounded-[22px] border border-border/70 bg-surface/45 p-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                Distance
                              </p>
                              <p className="mt-2 text-lg font-semibold text-foreground">
                                {formatDistanceKm(delivery.estimatedDistanceKm)}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-foreground">
                                {getRoutePhaseLabel(delivery.status)}
                              </p>
                              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                {formatPercent(progress)}
                              </p>
                            </div>
                            <div className="h-2.5 overflow-hidden rounded-full bg-secondary/90">
                              <div
                                className="h-full rounded-full bg-[linear-gradient(90deg,rgba(241,136,63,0.96),rgba(112,152,122,0.88))]"
                                style={{ width: `${Math.max(8, progress * 100)}%` }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <p className="font-semibold text-foreground">{delivery.pickupAddress}</p>
                            <p className="text-muted-foreground">{delivery.dropoffAddress}</p>
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            {delivery.customer ? <span className="stat-pill">{delivery.customer.name}</span> : null}
                            <span className="stat-pill">{formatShortTime(delivery.updatedAt)}</span>
                            {isSelected ? (
                              <span className="stat-pill">Live route selected</span>
                            ) : null}
                          </div>

                          <Button
                            variant={isSelected ? "default" : "outline"}
                            className="w-full"
                            onClick={() => {
                              setSelectedDeliveryId(delivery.id);
                              setRouteRefreshTick((value) => value + 1);
                            }}
                          >
                            {isSelected ? "Viewing route" : "Open route"}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="No assigned deliveries yet"
                  description="Accept one of the available orders to start filling the live route queue."
                />
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
