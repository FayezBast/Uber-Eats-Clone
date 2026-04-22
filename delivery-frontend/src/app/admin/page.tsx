"use client";

import Link from "next/link";
import {
  type LucideIcon,
  Activity,
  AlertTriangle,
  Bell,
  ChartColumn,
  Clock3,
  DollarSign,
  MapPinned,
  Navigation,
  Package2,
  RefreshCcw,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  UtensilsCrossed
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCurrency,
  formatDistanceKm,
  formatEtaSeconds,
  formatOrderTime,
  formatStatusLabel
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { apiClient } from "@/services/api/client";
import { useAuthStore } from "@/store/auth-store";
import {
  type AdminActivityLogItem,
  type AdminDashboard,
  type AdminDriverSummary,
  type DeliveryRecord,
  type DeliveryStatus,
  type DeliveryStatusHistoryItem,
  type NotificationItem,
  type TrackingSnapshot
} from "@/types";

type WatchTone = "critical" | "attention" | "stable";
type TrendTone = "positive" | "neutral" | "warning";
type LoadTone = "emerald" | "amber" | "sky" | "slate";
type AnalyticsWindow = 1 | 7 | 30;

interface WatchlistItem {
  id: string;
  tone: WatchTone;
  sourceLabel: string;
  title: string;
  summary: string;
  owner: string;
  timestamp: string;
  metadata: string[];
  ageMinutes: number;
}

interface DriverLocatorRecord {
  delivery: DeliveryRecord;
  tracking: TrackingSnapshot;
  latestActivity?: AdminActivityLogItem;
}

interface MapPlotPoint {
  id: string;
  left: number;
  top: number;
  current: boolean;
}

interface RevenuePoint {
  label: string;
  value: number;
}

interface LoadBarItem {
  label: string;
  value: number;
  tone: LoadTone;
}

const analyticsWindows: Array<{ label: string; value: AnalyticsWindow }> = [
  { label: "24h", value: 1 },
  { label: "7d", value: 7 },
  { label: "30d", value: 30 }
];

const deliveryStatusFilters: Array<{ label: string; value: "all" | DeliveryStatus }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Picked up", value: "picked_up" },
  { label: "Delivered", value: "delivered" }
];

const adminSelectClassName =
  "h-11 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none transition focus:border-emerald-400/30";

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function minutesSince(value: string) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.max(0, Math.round((Date.now() - timestamp) / 60000));
}

function formatMinutes(value: number) {
  if (value <= 0) {
    return "0 min";
  }

  if (value < 60) {
    return `${value} min`;
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatCoordinate(value: number) {
  return value.toFixed(5);
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function isWithinDays(value: string, days: AnalyticsWindow) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp <= days * 24 * 60 * 60 * 1000;
}

function matchesDeliverySearch(delivery: DeliveryRecord, searchQuery: string) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    `ue-${delivery.id}`,
    `delivery ${delivery.id}`,
    delivery.customer?.name ?? "",
    delivery.customer?.email ?? "",
    delivery.driver?.name ?? "",
    delivery.driver?.email ?? "",
    delivery.pickupAddress,
    delivery.dropoffAddress,
    delivery.priceDisplay,
    formatStatusLabel(delivery.status)
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function nextDeliveryStatus(delivery: DeliveryRecord): DeliveryStatus | null {
  switch (delivery.status) {
    case "accepted":
      return "picked_up";
    case "picked_up":
      return "delivered";
    default:
      return null;
  }
}

function toneScore(tone: WatchTone) {
  switch (tone) {
    case "critical":
      return 2;
    case "attention":
      return 1;
    default:
      return 0;
  }
}

function toneLabel(tone: WatchTone) {
  switch (tone) {
    case "critical":
      return "Critical";
    case "attention":
      return "Watch";
    default:
      return "Stable";
  }
}

function toneClasses(tone: WatchTone) {
  switch (tone) {
    case "critical":
      return {
        badge: "border-rose-500/30 bg-rose-500/12 text-rose-200",
        panel: "border-rose-500/18 bg-rose-500/[0.08]",
        icon: "bg-rose-500/14 text-rose-200"
      };
    case "attention":
      return {
        badge: "border-amber-400/30 bg-amber-400/12 text-amber-100",
        panel: "border-amber-400/18 bg-amber-400/[0.08]",
        icon: "bg-amber-400/14 text-amber-100"
      };
    default:
      return {
        badge: "border-white/10 bg-white/[0.05] text-white/72",
        panel: "border-white/8 bg-white/[0.03]",
        icon: "bg-white/[0.06] text-white/72"
      };
  }
}

function loadBarClasses(tone: LoadTone) {
  switch (tone) {
    case "amber":
      return "bg-amber-400";
    case "sky":
      return "bg-sky-400";
    case "slate":
      return "bg-white/55";
    default:
      return "bg-emerald-500";
  }
}

function statusPillClasses(status: DeliveryRecord["status"]) {
  switch (status) {
    case "delivered":
      return "border-emerald-500/25 bg-emerald-500/12 text-emerald-200";
    case "accepted":
    case "picked_up":
      return "border-sky-500/25 bg-sky-500/12 text-sky-200";
    default:
      return "border-amber-400/25 bg-amber-400/12 text-amber-100";
  }
}

function notificationPillClasses(tone: WatchTone) {
  switch (tone) {
    case "critical":
      return "border-rose-500/25 bg-rose-500/12 text-rose-200";
    case "attention":
      return "border-amber-400/25 bg-amber-400/12 text-amber-100";
    default:
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
  }
}

function trendLabel(delta: number | null) {
  if (delta === null) {
    return {
      text: "Stable vs prior window",
      tone: "neutral" as const
    };
  }

  if (delta < 0) {
    return {
      text: `${delta > -0.001 ? "0.0" : delta.toFixed(1)}% vs prior window`,
      tone: "warning" as const
    };
  }

  return {
    text: `+${delta.toFixed(1)}% vs prior window`,
    tone: "positive" as const
  };
}

function trendChipClasses(tone: TrendTone) {
  switch (tone) {
    case "positive":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
    case "warning":
      return "border-amber-400/25 bg-amber-400/12 text-amber-100";
    default:
      return "border-white/10 bg-white/[0.05] text-white/72";
  }
}

function pendingTone(minutesOpen: number): WatchTone {
  if (minutesOpen >= 18) {
    return "critical";
  }

  if (minutesOpen >= 10) {
    return "attention";
  }

  return "stable";
}

function activeTone(minutesIdle: number): WatchTone {
  if (minutesIdle >= 35) {
    return "critical";
  }

  if (minutesIdle >= 20) {
    return "attention";
  }

  return "stable";
}

function inboxTone(minutesOpen: number): WatchTone {
  if (minutesOpen >= 20) {
    return "critical";
  }

  if (minutesOpen >= 8) {
    return "attention";
  }

  return "stable";
}

function resolveOperatingPosture({
  criticalCount,
  attentionCount,
  coverageRate,
  pendingCount,
  unreadCount
}: {
  criticalCount: number;
  attentionCount: number;
  coverageRate: number;
  pendingCount: number;
  unreadCount: number;
}) {
  if (criticalCount > 0 || coverageRate < 0.7 || unreadCount >= 4) {
    return {
      label: "Escalated",
      tone: "critical" as const,
      summary: "Dispatch pressure or route aging has crossed the normal tolerance band. Operators should intervene."
    };
  }

  if (attentionCount > 0 || pendingCount >= 3 || unreadCount > 0) {
    return {
      label: "Watching",
      tone: "attention" as const,
      summary: "The network is still moving, but there are enough early signals to justify active monitoring."
    };
  }

  return {
    label: "Stable",
    tone: "stable" as const,
    summary: "Queue health, inbox pressure, and courier coverage are operating inside expected limits."
  };
}

function describeActivity(entry?: AdminActivityLogItem) {
  if (!entry) {
    return "No explicit driver event has been recorded yet for this route.";
  }

  if (entry.note) {
    return entry.note;
  }

  if (entry.changedBy) {
    return `${entry.changedBy.name} marked the route as ${formatStatusLabel(entry.status)}.`;
  }

  return `System activity recorded ${formatStatusLabel(entry.status)}.`;
}

function buildMapPlotPoints(tracking: TrackingSnapshot): MapPlotPoint[] {
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

function buildRevenueTrend(deliveries: DeliveryRecord[], windowDays: AnalyticsWindow) {
  const now = Date.now();
  const bucketCount = windowDays === 1 ? 8 : windowDays === 30 ? 10 : 7;
  const bucketSizeMs = (windowDays * 24 * 60 * 60 * 1000) / bucketCount;
  const bucketStart = now - windowDays * 24 * 60 * 60 * 1000;
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const start = bucketStart + index * bucketSizeMs;
    const end = start + bucketSizeMs;
    const date = new Date(end);

    return {
      label:
        windowDays === 1
          ? date.toLocaleTimeString("en-US", { hour: "numeric" })
          : date.toLocaleDateString("en-US", windowDays === 30 ? { month: "short", day: "numeric" } : { weekday: "short" }),
      start,
      end,
      value: 0
    };
  });

  deliveries.forEach((delivery) => {
    const timestamp = new Date(delivery.updatedAt).getTime();

    if (Number.isNaN(timestamp) || timestamp < bucketStart || timestamp > now) {
      return;
    }

    const index = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor((timestamp - bucketStart) / bucketSizeMs))
    );
    buckets[index].value += delivery.price;
  });

  return buckets.map((bucket) => ({
    label: bucket.label,
    value: bucket.value
  }));
}

function calculateWindowDelta(points: RevenuePoint[]) {
  if (!points.length) {
    return null;
  }

  const midpoint = Math.floor(points.length / 2);
  const firstWindow = points.slice(0, midpoint).reduce((sum, point) => sum + point.value, 0);
  const secondWindow = points.slice(midpoint).reduce((sum, point) => sum + point.value, 0);

  if (firstWindow === 0 && secondWindow === 0) {
    return null;
  }

  if (firstWindow === 0) {
    return 100;
  }

  return ((secondWindow - firstWindow) / firstWindow) * 100;
}

function DashboardShell({
  title,
  description,
  action,
  children,
  className,
  id
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-[30px] border border-white/8 bg-[#151515] p-5 text-white shadow-[0_24px_50px_rgba(0,0,0,0.22)] sm:p-6",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-[1.45rem]">{title}</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-white/55">{description}</p>
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SidebarNavItem({
  href,
  icon: Icon,
  label,
  value,
  active = false
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value?: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-colors",
        active
          ? "bg-white/[0.08] text-white"
          : "text-white/66 hover:bg-white/[0.04] hover:text-white"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1">{label}</span>
      {value ? (
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] tracking-[0.14em] text-white/60">
          {value}
        </span>
      ) : null}
    </a>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  chip,
  chipTone = "neutral"
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  chip: string;
  chipTone?: TrendTone;
}) {
  return (
    <div className="rounded-[28px] border border-white/8 bg-[#171717] p-5 text-white shadow-[0_20px_40px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">{label}</p>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-[2.2rem]">{value}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/18 bg-emerald-500/10 p-3 text-emerald-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className={cn("rounded-full border px-3 py-1 text-xs", trendChipClasses(chipTone))}>{chip}</div>
        <p className="text-sm text-white/55">{detail}</p>
      </div>
    </div>
  );
}

function RevenueTrendChart({ points }: { points: RevenuePoint[] }) {
  const width = 760;
  const height = 280;
  const padding = {
    top: 16,
    right: 18,
    bottom: 38,
    left: 18
  };
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const positions = points.map((point, index) => {
    const x =
      padding.left +
      (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth);
    const y = padding.top + chartHeight - (point.value / maxValue) * chartHeight;

    return {
      ...point,
      x,
      y
    };
  });

  const linePath = positions
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = [
    `M ${positions[0]?.x ?? padding.left} ${padding.top + chartHeight}`,
    ...positions.map((point) => `L ${point.x} ${point.y}`),
    `L ${positions[positions.length - 1]?.x ?? padding.left} ${padding.top + chartHeight}`,
    "Z"
  ].join(" ");

  return (
    <div className="rounded-[26px] border border-white/8 bg-[#111111] p-3 sm:p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[280px] w-full" role="img" aria-label="Revenue trend">
        <defs>
          <linearGradient id="admin-revenue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(34,197,94,0.32)" />
            <stop offset="100%" stopColor="rgba(34,197,94,0.02)" />
          </linearGradient>
        </defs>

        {Array.from({ length: 4 }).map((_, index) => {
          const y = padding.top + (chartHeight / 3) * index;
          return (
            <line
              key={`grid-${index}`}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.22)"
              strokeDasharray="4 6"
            />
          );
        })}

        <path d={areaPath} fill="url(#admin-revenue-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#22c55e"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />

        {positions.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4" fill="#22c55e" />
            <circle cx={point.x} cy={point.y} r="8" fill="rgba(34,197,94,0.15)" />
            <text
              x={point.x}
              y={height - 10}
              fill="rgba(255,255,255,0.48)"
              fontSize="12"
              textAnchor="middle"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function DistributionBars({ items }: { items: LoadBarItem[] }) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-white/62">{item.label}</span>
            <span className="text-white/78">{item.value}</span>
          </div>
          <div className="h-10 rounded-2xl bg-white/[0.05] p-1">
            <div
              className={cn("h-full rounded-[14px]", loadBarClasses(item.tone))}
              style={{ width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 12 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: DeliveryRecord["status"] }) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs tracking-[0.08em]",
        statusPillClasses(status)
      )}
    >
      {formatStatusLabel(status)}
    </div>
  );
}

function DriverRouteMap({ tracking }: { tracking: TrackingSnapshot }) {
  const plotPoints = buildMapPlotPoints(tracking);

  return (
    <div className="relative h-[260px] overflow-hidden rounded-[24px] border border-white/10 bg-[#0e0e0e]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.1),transparent_26%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:56px_56px]" />
      <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/62">
        GPS route
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
                ? "h-4 w-4 border-4 border-black bg-emerald-400 shadow-[0_0_0_12px_rgba(34,197,94,0.14)]"
                : "h-2.5 w-2.5 bg-white/45"
            )}
          />
        </div>
      ))}
      <div className="absolute inset-x-4 bottom-4 rounded-[18px] border border-white/10 bg-black/40 p-4 backdrop-blur">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">Latitude</p>
            <p className="mt-2 text-sm font-semibold text-white">{formatCoordinate(tracking.currentLatitude)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">Longitude</p>
            <p className="mt-2 text-sm font-semibold text-white">{formatCoordinate(tracking.currentLongitude)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminLoadingState() {
  return (
    <>
      <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`admin-stat-skeleton-${index}`}
            className="h-[170px] animate-pulse rounded-[28px] bg-[#dbd8d0]"
          />
        ))}
      </section>
      <section className="grid gap-4 2xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
        <div className="h-[420px] animate-pulse rounded-[30px] bg-[#dbd8d0]" />
        <div className="h-[420px] animate-pulse rounded-[30px] bg-[#dbd8d0]" />
      </section>
      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
        <div className="h-[420px] animate-pulse rounded-[30px] bg-[#dbd8d0]" />
        <div className="h-[420px] animate-pulse rounded-[30px] bg-[#dbd8d0]" />
      </section>
    </>
  );
}

export default function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const userId = user?.id;
  const userRole = user?.role;
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [drivers, setDrivers] = useState<AdminDriverSummary[]>([]);
  const [logs, setLogs] = useState<AdminActivityLogItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [analyticsWindow, setAnalyticsWindow] = useState<AnalyticsWindow>(7);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DeliveryStatus>("all");
  const [locatorOpen, setLocatorOpen] = useState(false);
  const [locatorRefreshTick, setLocatorRefreshTick] = useState(0);
  const [driverLocatorRecords, setDriverLocatorRecords] = useState<DriverLocatorRecord[]>([]);
  const [driverLocatorLoading, setDriverLocatorLoading] = useState(false);
  const [driverLocatorError, setDriverLocatorError] = useState("");
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(null);
  const [selectedDeliveryHistory, setSelectedDeliveryHistory] = useState<DeliveryStatusHistoryItem[]>([]);
  const [selectedDeliveryTracking, setSelectedDeliveryTracking] = useState<TrackingSnapshot | null>(null);
  const [selectedDeliveryLoading, setSelectedDeliveryLoading] = useState(false);
  const [selectedDeliveryError, setSelectedDeliveryError] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [actionState, setActionState] = useState<"idle" | "assigning" | "updating" | "reading">("idle");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!userId || userRole !== "admin") {
      setDashboard(null);
      setDeliveries([]);
      setDrivers([]);
      setLogs([]);
      setNotifications([]);
      setError("");
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [nextDashboard, nextDeliveries, nextDrivers, nextLogs, nextNotifications] = await Promise.all([
          apiClient.getAdminDashboard(),
          apiClient.getAdminDeliveries(),
          apiClient.getAdminDrivers(),
          apiClient.getAdminLogs(),
          apiClient.getNotifications()
        ]);

        if (!mounted) {
          return;
        }

        setDashboard(nextDashboard);
        setDeliveries(nextDeliveries);
        setDrivers(nextDrivers);
        setLogs(nextLogs);
        setNotifications(nextNotifications);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load the admin operations page.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, [hydrated, refreshTick, userId, userRole]);

  const sortedDeliveries = useMemo(
    () =>
      [...deliveries].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      ),
    [deliveries]
  );

  const sortedLogs = useMemo(
    () =>
      [...logs].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      ),
    [logs]
  );

  const notificationFeed = useMemo(
    () =>
      [...notifications].sort((left, right) => {
        const unreadWeight = Number(Boolean(left.readAt)) - Number(Boolean(right.readAt));

        if (unreadWeight !== 0) {
          return unreadWeight;
        }

        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }),
    [notifications]
  );

  const analyticsDeliveries = useMemo(
    () => sortedDeliveries.filter((delivery) => isWithinDays(delivery.updatedAt, analyticsWindow)),
    [analyticsWindow, sortedDeliveries]
  );

  const analyticsLogs = useMemo(
    () => sortedLogs.filter((entry) => isWithinDays(entry.createdAt, analyticsWindow)),
    [analyticsWindow, sortedLogs]
  );

  const analyticsNotifications = useMemo(
    () => notificationFeed.filter((notification) => isWithinDays(notification.createdAt, analyticsWindow)),
    [analyticsWindow, notificationFeed]
  );

  const visibleDeliveries = useMemo(
    () =>
      analyticsDeliveries.filter((delivery) => {
        if (statusFilter !== "all" && delivery.status !== statusFilter) {
          return false;
        }

        return matchesDeliverySearch(delivery, searchQuery);
      }),
    [analyticsDeliveries, searchQuery, statusFilter]
  );

  const pendingDeliveries = useMemo(
    () => sortedDeliveries.filter((delivery) => delivery.status === "pending"),
    [sortedDeliveries]
  );

  const activeDeliveries = useMemo(
    () =>
      sortedDeliveries.filter(
        (delivery) => delivery.status === "accepted" || delivery.status === "picked_up"
      ),
    [sortedDeliveries]
  );

  const completedDeliveries = useMemo(
    () => sortedDeliveries.filter((delivery) => delivery.status === "delivered"),
    [sortedDeliveries]
  );

  const unreadNotifications = useMemo(
    () => notificationFeed.filter((notification) => !notification.readAt),
    [notificationFeed]
  );

  const selectedDelivery = useMemo(
    () => sortedDeliveries.find((delivery) => delivery.id === selectedDeliveryId) ?? null,
    [selectedDeliveryId, sortedDeliveries]
  );

  const pendingWaitMinutes = useMemo(
    () => pendingDeliveries.map((delivery) => minutesSince(delivery.createdAt)),
    [pendingDeliveries]
  );

  const activeIdleMinutes = useMemo(
    () => activeDeliveries.map((delivery) => minutesSince(delivery.updatedAt)),
    [activeDeliveries]
  );

  const averagePendingMinutes = average(pendingWaitMinutes);
  const averageActiveMinutes = average(activeIdleMinutes);
  const oldestPendingMinutes = pendingWaitMinutes.length ? Math.max(...pendingWaitMinutes) : 0;
  const longestActiveMinutes = activeIdleMinutes.length ? Math.max(...activeIdleMinutes) : 0;
  const totalDeliveries = dashboard?.metrics.totalDeliveries ?? sortedDeliveries.length;
  const completedCount = dashboard?.metrics.completedDeliveries ?? completedDeliveries.length;
  const revenue = dashboard?.metrics.totalRevenue ?? 0;
  const activeStaffed = activeDeliveries.filter((delivery) => Boolean(delivery.driver)).length;
  const coverageRate = activeDeliveries.length
    ? activeStaffed / activeDeliveries.length
    : pendingDeliveries.length
      ? 0
      : 1;
  const completionRate = totalDeliveries ? completedCount / totalDeliveries : 0;
  const averageOrderValue = completedCount ? revenue / completedCount : 0;
  const visibleLogs = analyticsLogs.slice(0, 5);
  const recentDelivery = dashboard?.recentDeliveries[0];
  const adminInterventions = sortedLogs.filter((entry) => entry.changedBy?.role === "admin").length;
  const driverTransitions = sortedLogs.filter((entry) => entry.changedBy?.role === "driver").length;
  const systemEvents = sortedLogs.filter((entry) => !entry.changedBy).length;
  const trackableDriverDeliveries = useMemo(
    () => activeDeliveries.filter((delivery) => Boolean(delivery.driver)),
    [activeDeliveries]
  );
  const gpsCoverageRate = activeDeliveries.length
    ? trackableDriverDeliveries.length / activeDeliveries.length
    : 1;
  const routesWithoutAssignedDriver = activeDeliveries.length - trackableDriverDeliveries.length;

  const watchlist = useMemo(() => {
    const deliverySignals = sortedDeliveries
      .filter((delivery) => delivery.status !== "delivered")
      .map((delivery): WatchlistItem => {
        const ageMinutes =
          delivery.status === "pending"
            ? minutesSince(delivery.createdAt)
            : minutesSince(delivery.updatedAt);
        const tone =
          delivery.status === "pending" ? pendingTone(ageMinutes) : activeTone(ageMinutes);

        return {
          id: `delivery-${delivery.id}`,
          tone,
          sourceLabel: delivery.status === "pending" ? "Dispatch risk" : "Route risk",
          title:
            delivery.status === "pending"
              ? `Delivery #${delivery.id} is waiting for assignment`
              : `Delivery #${delivery.id} has stalled in-flight`,
          summary:
            delivery.status === "pending"
              ? `${delivery.customer?.name ?? "Customer"} has been in queue for ${formatMinutes(ageMinutes)} without a courier.`
              : `${delivery.driver?.name ?? "Assigned courier"} has not moved the route for ${formatMinutes(ageMinutes)}.`,
          owner: delivery.driver?.name ?? "Dispatch",
          timestamp: formatOrderTime(
            delivery.status === "pending" ? delivery.createdAt : delivery.updatedAt
          ),
          metadata: [delivery.priceDisplay, formatDistanceKm(delivery.estimatedDistanceKm)],
          ageMinutes
        };
      });

    const inboxSignals = unreadNotifications.map((notification): WatchlistItem => {
      const ageMinutes = minutesSince(notification.createdAt);

      return {
        id: `notification-${notification.id}`,
        tone: inboxTone(ageMinutes),
        sourceLabel: "Unread alert",
        title: notification.type,
        summary: notification.message,
        owner: "Admin inbox",
        timestamp: formatOrderTime(notification.createdAt),
        metadata: [`Open ${formatMinutes(ageMinutes)}`],
        ageMinutes
      };
    });

    return [...deliverySignals, ...inboxSignals]
      .sort((left, right) => {
        const toneWeight = toneScore(right.tone) - toneScore(left.tone);

        if (toneWeight !== 0) {
          return toneWeight;
        }

        return right.ageMinutes - left.ageMinutes;
      })
      .slice(0, 5);
  }, [sortedDeliveries, unreadNotifications]);

  useEffect(() => {
    if (!locatorOpen || userRole !== "admin") {
      return;
    }

    let cancelled = false;

    async function loadDriverLocator() {
      if (!trackableDriverDeliveries.length) {
        setDriverLocatorRecords((current) => (current.length ? [] : current));
        setDriverLocatorError("");
        setDriverLocatorLoading(false);
        return;
      }

      setDriverLocatorLoading(true);
      setDriverLocatorError("");

      try {
        const records = await Promise.all(
          trackableDriverDeliveries.map(async (delivery) => {
            const tracking = await apiClient.getDeliveryTracking(delivery.id);
            const latestActivity = sortedLogs.find((entry) => entry.deliveryId === delivery.id);

            return {
              delivery,
              tracking,
              latestActivity
            };
          })
        );

        if (!cancelled) {
          setDriverLocatorRecords(
            records.sort(
              (left, right) =>
                minutesSince(right.delivery.updatedAt) - minutesSince(left.delivery.updatedAt)
            )
          );
        }
      } catch (err) {
        if (!cancelled) {
          setDriverLocatorError(
            err instanceof Error ? err.message : "Unable to locate live drivers right now."
          );
        }
      } finally {
        if (!cancelled) {
          setDriverLocatorLoading(false);
        }
      }
    }

    void loadDriverLocator();

    return () => {
      cancelled = true;
    };
  }, [locatorOpen, locatorRefreshTick, sortedLogs, trackableDriverDeliveries, userRole]);

  useEffect(() => {
    if (!selectedDeliveryId || userRole !== "admin") {
      setSelectedDeliveryHistory([]);
      setSelectedDeliveryTracking(null);
      setSelectedDeliveryError("");
      setSelectedDeliveryLoading(false);
      return;
    }

    let cancelled = false;
    const deliveryId = selectedDeliveryId;

    async function loadSelectedDeliveryDetails() {
      setSelectedDeliveryLoading(true);
      setSelectedDeliveryError("");

      try {
        const [history, tracking] = await Promise.all([
          apiClient.getDeliveryStatusHistory(deliveryId),
          apiClient.getDeliveryTracking(deliveryId)
        ]);

        if (cancelled) {
          return;
        }

        setSelectedDeliveryHistory(history);
        setSelectedDeliveryTracking(tracking);
      } catch (err) {
        if (!cancelled) {
          setSelectedDeliveryError(
            err instanceof Error ? err.message : "Unable to load delivery details."
          );
        }
      } finally {
        if (!cancelled) {
          setSelectedDeliveryLoading(false);
        }
      }
    }

    void loadSelectedDeliveryDetails();

    return () => {
      cancelled = true;
    };
  }, [refreshTick, selectedDeliveryId, userRole]);

  useEffect(() => {
    if (!selectedDelivery) {
      setSelectedDriverId("");
      setActionNote("");
      setActionError("");
      setActionMessage("");
      return;
    }

    setSelectedDriverId(selectedDelivery.driverId ? String(selectedDelivery.driverId) : "");
    setActionNote("");
    setActionError("");
    setActionMessage("");
  }, [selectedDelivery]);

  async function handleAssignSelectedDelivery() {
    if (!selectedDelivery || !selectedDriverId) {
      setActionError("Choose a driver before assigning this delivery.");
      return;
    }

    setActionState("assigning");
    setActionError("");
    setActionMessage("");

    try {
      await apiClient.assignAdminDelivery(selectedDelivery.id, Number(selectedDriverId), actionNote);
      setActionMessage("Driver assigned successfully.");
      setRefreshTick((value) => value + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to assign this delivery.");
    } finally {
      setActionState("idle");
    }
  }

  async function handleAdvanceSelectedDelivery() {
    if (!selectedDelivery) {
      return;
    }

    const nextStatus = nextDeliveryStatus(selectedDelivery);
    if (!nextStatus) {
      setActionError("This delivery cannot be advanced from its current state.");
      return;
    }

    setActionState("updating");
    setActionError("");
    setActionMessage("");

    try {
      await apiClient.updateAdminDeliveryStatus(selectedDelivery.id, nextStatus, actionNote);
      setActionMessage(`Delivery moved to ${formatStatusLabel(nextStatus)}.`);
      setRefreshTick((value) => value + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to update this delivery.");
    } finally {
      setActionState("idle");
    }
  }

  async function handleMarkNotificationRead(notificationId: number) {
    setActionState("reading");
    setActionError("");
    setActionMessage("");

    try {
      await apiClient.markNotificationRead(notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, readAt: new Date().toISOString() }
            : notification
        )
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to mark notification as read.");
    } finally {
      setActionState("idle");
    }
  }

  async function handleMarkAllNotificationsRead() {
    const unreadIds = unreadNotifications.map((notification) => notification.id);
    if (!unreadIds.length) {
      return;
    }

    setActionState("reading");
    setActionError("");
    setActionMessage("");

    try {
      await Promise.all(unreadIds.map((notificationId) => apiClient.markNotificationRead(notificationId)));
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) =>
          unreadIds.includes(notification.id) ? { ...notification, readAt } : notification
        )
      );
      setActionMessage("All unread alerts were marked as read.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to mark alerts as read.");
    } finally {
      setActionState("idle");
    }
  }

  const criticalSignals = watchlist.filter((item) => item.tone === "critical").length;
  const attentionSignals = watchlist.filter((item) => item.tone === "attention").length;
  const operatingPosture = resolveOperatingPosture({
    criticalCount: criticalSignals,
    attentionCount: attentionSignals,
    coverageRate,
    pendingCount: pendingDeliveries.length,
    unreadCount: unreadNotifications.length
  });
  const postureClasses = toneClasses(operatingPosture.tone);

  const revenueTrend = useMemo(
    () =>
      buildRevenueTrend(
        analyticsDeliveries.filter((delivery) => delivery.status === "delivered"),
        analyticsWindow
      ),
    [analyticsDeliveries, analyticsWindow]
  );
  const revenueDelta = useMemo(() => trendLabel(calculateWindowDelta(revenueTrend)), [revenueTrend]);

  const operationalLoad = useMemo(
    () =>
      [
        {
          label: "Delivered",
          value: completedDeliveries.length,
          tone: "emerald" as const
        },
        {
          label: "Routes in flight",
          value: activeDeliveries.length,
          tone: "sky" as const
        },
        {
          label: "Pending dispatch",
          value: pendingDeliveries.length,
          tone: "amber" as const
        },
        {
          label: "Unread alerts",
          value: unreadNotifications.length,
          tone: "slate" as const
        },
        {
          label: "Critical signals",
          value: criticalSignals,
          tone: "amber" as const
        }
      ].sort((left, right) => right.value - left.value),
    [
      activeDeliveries.length,
      completedDeliveries.length,
      criticalSignals,
      pendingDeliveries.length,
      unreadNotifications.length
    ]
  );
  const sortedDrivers = useMemo(
    () =>
      [...drivers].sort((left, right) => {
        if (left.activeDeliveries !== right.activeDeliveries) {
          return left.activeDeliveries - right.activeDeliveries;
        }

        return left.name.localeCompare(right.name);
      }),
    [drivers]
  );
  const selectedDeliveryNextStatus = selectedDelivery ? nextDeliveryStatus(selectedDelivery) : null;

  const userInitials = useMemo(() => getInitials(user?.fullName ?? "Admin"), [user?.fullName]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#090909] p-3 sm:p-4 lg:p-6">
        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
          <div className="h-[420px] animate-pulse rounded-[32px] bg-[#141414]" />
          <div className="h-[740px] animate-pulse rounded-[32px] bg-[#efede7]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-10">
        <EmptyState
          title="Sign in as an admin"
          description="This workspace consolidates live operations, dispatch pressure, audit activity, and notifications into a protected admin-only console."
          action={
            <Button asChild>
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="container py-10">
        <EmptyState
          title="Admin access required"
          description="This console is reserved for admin accounts. Customer, driver, and restaurant owner roles each have their own operational workspace."
          action={
            <Button asChild variant="outline">
              <Link
                href={
                  user.role === "driver" ? "/driver" : user.role === "owner" ? "/owner" : "/orders"
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
    <Dialog open={locatorOpen} onOpenChange={setLocatorOpen}>
      <div className="min-h-screen bg-[#090909] p-3 sm:p-4 lg:p-6">
        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_28%),linear-gradient(180deg,#141414_0%,#101010_100%)] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-6">
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-500 p-3 text-slate-950">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-tight text-white">EatsAdmin</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/38">Control Center</p>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/34">
                  Operations
                </p>
                <nav className="mt-3 space-y-1.5">
                  <SidebarNavItem href="#overview" icon={ChartColumn} label="Dashboard" value={String(totalDeliveries || 0)} active />
                  <SidebarNavItem href="#live-orders" icon={Package2} label="Orders" value={String(pendingDeliveries.length)} />
                  <SidebarNavItem href="#watchlist" icon={AlertTriangle} label="Alerts" value={String(watchlist.length)} />
                  <SidebarNavItem href="#drivers" icon={Truck} label="Couriers" value={String(trackableDriverDeliveries.length)} />
                  <SidebarNavItem href="#activity" icon={Activity} label="Activity" value={String(visibleLogs.length)} />
                </nav>
              </div>

              <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/36">Network posture</p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                      {operatingPosture.label}
                    </p>
                  </div>
                  <div className={cn("rounded-2xl p-2.5", postureClasses.icon)}>
                    <ShieldCheck className="h-4.5 w-4.5" />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/58">{operatingPosture.summary}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/34">Critical</p>
                    <p className="mt-2 text-lg font-semibold text-white">{criticalSignals}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/34">Unread</p>
                    <p className="mt-2 text-lg font-semibold text-white">{unreadNotifications.length}</p>
                  </div>
                </div>
              </div>

              <a
                href="#activity"
                className="mt-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <Settings className="h-4 w-4" />
                Settings
              </a>
            </div>
          </aside>

          <main className="overflow-hidden rounded-[32px] border border-black/5 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.1),transparent_22%),linear-gradient(180deg,#faf9f5_0%,#f1efeb_100%)] shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
            <header className="border-b border-black/6 bg-white/72 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/8 bg-white text-slate-700">
                    <ChartColumn className="h-5 w-5" />
                  </div>
                  <div className="relative w-full min-w-0 sm:w-[26rem] xl:w-[32rem]">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search orders, couriers, alerts..."
                      className="h-12 rounded-2xl border-black/8 bg-white pl-11 pr-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <a
                    href="#alerts"
                    className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-black/8 bg-white text-slate-700"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4.5 w-4.5" />
                    {unreadNotifications.length ? (
                      <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    ) : null}
                  </a>
                  <div className="flex h-12 min-w-[3rem] items-center justify-center rounded-2xl border border-emerald-500/15 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-700">
                    {userInitials}
                  </div>
                </div>
              </div>
            </header>

            <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
              <section
                id="overview"
                className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
              >
                <div>
                  <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-[3rem]">
                    Dashboard
                  </h1>
                  <p className="mt-2 max-w-2xl text-base text-slate-500">
                    Real-time overview of your delivery network.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <div className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-sm text-slate-500">
                      Snapshot {dashboard ? formatOrderTime(dashboard.generatedAt) : "pending"}
                    </div>
                    {recentDelivery ? (
                      <div className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-sm text-slate-500">
                        Latest intake: Delivery #{recentDelivery.id}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="flex flex-wrap gap-2">
                    {analyticsWindows.map((window) => (
                      <button
                        key={window.value}
                        type="button"
                        onClick={() => setAnalyticsWindow(window.value)}
                        className={cn(
                          "rounded-2xl border px-4 py-3 text-sm transition-colors",
                          analyticsWindow === window.value
                            ? "border-emerald-500/15 bg-emerald-500 text-slate-950"
                            : "border-black/8 bg-white text-slate-700"
                        )}
                      >
                        {window.label}
                      </button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRefreshTick((value) => value + 1)}
                    disabled={loading}
                    className="border-black/8 bg-white text-slate-800 hover:translate-y-0 hover:bg-slate-100 hover:shadow-none"
                  >
                    <RefreshCcw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                    Refresh
                  </Button>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      className="bg-emerald-500 text-slate-950 shadow-none hover:translate-y-0 hover:bg-emerald-400 hover:shadow-none"
                    >
                      <MapPinned className="h-4 w-4" />
                      Driver locator
                    </Button>
                  </DialogTrigger>
                </div>
              </section>

              {error ? <ErrorState description={error} /> : null}
              {actionError ? (
                <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                  {actionError}
                </div>
              ) : null}
              {actionMessage ? (
                <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                  {actionMessage}
                </div>
              ) : null}

              {loading ? (
                <AdminLoadingState />
              ) : dashboard ? (
                <>
                  <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
                    <StatCard
                      icon={DollarSign}
                      label="Revenue"
                      value={dashboard.metrics.totalRevenueDisplay}
                      detail={`${completedCount} completed deliveries`}
                      chip={`Avg basket ${formatCurrency(averageOrderValue)}`}
                      chipTone="positive"
                    />
                    <StatCard
                      icon={Package2}
                      label="Orders"
                      value={String(totalDeliveries)}
                      detail={`${pendingDeliveries.length} waiting on dispatch`}
                      chip={`${activeDeliveries.length} routes in flight`}
                      chipTone={pendingDeliveries.length ? "warning" : "neutral"}
                    />
                    <StatCard
                      icon={Users}
                      label="Customers"
                      value={String(dashboard.metrics.totalCustomers)}
                      detail={`${dashboard.metrics.totalUsers} total accounts on the network`}
                      chip={`${unreadNotifications.length} unread alerts`}
                      chipTone={unreadNotifications.length ? "warning" : "neutral"}
                    />
                    <StatCard
                      icon={Truck}
                      label="Couriers"
                      value={String(dashboard.metrics.totalDrivers)}
                      detail={`${activeStaffed} staffed active routes`}
                      chip={`${formatPercent(coverageRate)} coverage`}
                      chipTone={coverageRate < 0.7 ? "warning" : "positive"}
                    />
                  </section>

                  <section className="grid gap-4 2xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
                    <DashboardShell
                      title="Revenue trend"
                      description="Daily completed-delivery revenue over the last seven days."
                      action={
                        <div className={cn("rounded-full border px-3 py-1 text-xs", trendChipClasses(revenueDelta.tone))}>
                          {revenueDelta.text}
                        </div>
                      }
                    >
                      <RevenueTrendChart points={revenueTrend} />
                    </DashboardShell>

                    <DashboardShell
                      title="Operational load"
                      description="Where volume and pressure are concentrated right now."
                    >
                      <DistributionBars items={operationalLoad} />
                    </DashboardShell>
                  </section>

                  <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
                    <DashboardShell
                      id="live-orders"
                      title="Live orders"
                      description={`Operational feed filtered to the last ${analyticsWindow} day${analyticsWindow === 1 ? "" : "s"}.`}
                      className="overflow-hidden"
                      action={
                        <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/68">
                          {visibleDeliveries.length} matching deliveries
                        </div>
                      }
                    >
                      <div className="mb-4 flex flex-wrap gap-2">
                        {deliveryStatusFilters.map((filter) => (
                          <button
                            key={filter.value}
                            type="button"
                            onClick={() => setStatusFilter(filter.value)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs transition-colors",
                              statusFilter === filter.value
                                ? "border-emerald-500/20 bg-emerald-500 text-slate-950"
                                : "border-white/10 bg-white/[0.04] text-white/68"
                            )}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                      {visibleDeliveries.length ? (
                        <div className="-mx-5 overflow-x-auto sm:-mx-6">
                          <table className="min-w-full border-separate border-spacing-0 text-left">
                            <thead>
                              <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.18em] text-white/38">
                                <th className="px-5 pb-4 sm:px-6">Order</th>
                                <th className="px-5 pb-4 sm:px-6">Customer</th>
                                <th className="px-5 pb-4 sm:px-6">Courier</th>
                                <th className="px-5 pb-4 sm:px-6">Route</th>
                                <th className="px-5 pb-4 sm:px-6">Total</th>
                                <th className="px-5 pb-4 sm:px-6">Status</th>
                                <th className="px-5 pb-4 sm:px-6">Updated</th>
                                <th className="px-5 pb-4 sm:px-6">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleDeliveries.slice(0, 10).map((delivery) => (
                                <tr
                                  key={delivery.id}
                                  className={cn(
                                    "align-top text-sm text-white/72 transition-colors",
                                    selectedDeliveryId === delivery.id ? "bg-white/[0.03]" : ""
                                  )}
                                >
                                  <td className="border-t border-white/8 px-5 py-5 sm:px-6">
                                    <p className="font-medium text-white">UE-{delivery.id}</p>
                                  </td>
                                  <td className="border-t border-white/8 px-5 py-5 sm:px-6">
                                    {delivery.customer?.name ?? "Guest customer"}
                                  </td>
                                  <td className="border-t border-white/8 px-5 py-5 sm:px-6">
                                    {delivery.driver?.name ?? "Unassigned"}
                                  </td>
                                  <td className="border-t border-white/8 px-5 py-5 sm:px-6">
                                    <p className="max-w-[20rem] truncate">{delivery.pickupAddress}</p>
                                    <p className="mt-1 max-w-[20rem] truncate text-white/42">{delivery.dropoffAddress}</p>
                                  </td>
                                  <td className="border-t border-white/8 px-5 py-5 sm:px-6">{delivery.priceDisplay}</td>
                                  <td className="border-t border-white/8 px-5 py-5 sm:px-6">
                                    <StatusPill status={delivery.status} />
                                  </td>
                                  <td className="border-t border-white/8 px-5 py-5 text-white/48 sm:px-6">
                                    {formatOrderTime(delivery.updatedAt)}
                                  </td>
                                  <td className="border-t border-white/8 px-5 py-5 sm:px-6">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedDeliveryId(delivery.id)}
                                      className="border-white/10 bg-white/[0.05] text-white hover:translate-y-0 hover:bg-white/[0.08] hover:text-white hover:shadow-none"
                                    >
                                      Operate
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-white/58">
                          No deliveries match the current search and status filters.
                        </div>
                      )}
                    </DashboardShell>

                    <DashboardShell
                      id="watchlist"
                      title="Watchlist"
                      description="Prioritized by route age, dispatch lag, and unread notifications."
                      action={
                        <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/68">
                          {watchlist.length} open
                        </div>
                      }
                    >
                      <div className="space-y-3">
                        {watchlist.length ? (
                          watchlist.map((item) => {
                            const styles = toneClasses(item.tone);

                            return (
                              <div
                                key={item.id}
                                className={cn("rounded-[24px] border p-4", styles.panel)}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                        {item.sourceLabel}
                                      </div>
                                      <div className={cn("rounded-full border px-3 py-1 text-xs", styles.badge)}>
                                        {toneLabel(item.tone)}
                                      </div>
                                    </div>
                                    <p className="mt-3 text-base font-semibold tracking-tight text-white">
                                      {item.title}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-white/58">{item.summary}</p>
                                  </div>
                                  <div className={cn("rounded-2xl p-2.5", styles.icon)}>
                                    <AlertTriangle className="h-4.5 w-4.5" />
                                  </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/58">
                                    Owner: {item.owner}
                                  </div>
                                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/58">
                                    {item.timestamp}
                                  </div>
                                  {item.metadata.map((meta) => (
                                    <div
                                      key={`${item.id}-${meta}`}
                                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/58"
                                    >
                                      {meta}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-white/58">
                            No open escalations. Dispatch, route aging, and inbox pressure are all inside tolerance.
                          </div>
                        )}
                      </div>
                    </DashboardShell>
                  </section>

                  <section className="grid gap-4 xl:grid-cols-3">
                    <DashboardShell
                      id="alerts"
                      title="Alerts"
                      description={`Alerts created in the last ${analyticsWindow} day${analyticsWindow === 1 ? "" : "s"}.`}
                      action={
                        <div className="flex flex-wrap gap-2">
                          <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/68">
                            {unreadNotifications.length} unread
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleMarkAllNotificationsRead}
                            disabled={actionState === "reading" || !unreadNotifications.length}
                            className="border-white/10 bg-white/[0.05] text-white hover:translate-y-0 hover:bg-white/[0.08] hover:text-white hover:shadow-none"
                          >
                            Mark all read
                          </Button>
                        </div>
                      }
                    >
                      <div className="space-y-3">
                        {analyticsNotifications.length ? (
                          analyticsNotifications.slice(0, 6).map((notification) => {
                            const ageMinutes = minutesSince(notification.createdAt);
                            const tone = notification.readAt ? "stable" : inboxTone(ageMinutes);

                            return (
                              <div
                                key={notification.id}
                                className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-white">{notification.type}</p>
                                    <p className="mt-2 text-sm leading-6 text-white/58">{notification.message}</p>
                                  </div>
                                  <div
                                    className={cn(
                                      "rounded-full border px-3 py-1 text-xs",
                                      notification.readAt
                                        ? "border-white/10 bg-white/[0.05] text-white/58"
                                        : notificationPillClasses(tone)
                                    )}
                                  >
                                    {notification.readAt ? "Read" : toneLabel(tone)}
                                  </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/58">
                                    {formatOrderTime(notification.createdAt)}
                                  </div>
                                  {!notification.readAt ? (
                                    <>
                                      <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/58">
                                        Open {formatMinutes(ageMinutes)}
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleMarkNotificationRead(notification.id)}
                                        disabled={actionState === "reading"}
                                        className="h-8 rounded-full border-white/10 bg-white/[0.05] px-3 text-white hover:translate-y-0 hover:bg-white/[0.08] hover:text-white hover:shadow-none"
                                      >
                                        Mark read
                                      </Button>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-white/58">
                            No alerts were created inside the current analytics window.
                          </div>
                        )}
                      </div>
                    </DashboardShell>

                    <DashboardShell
                      id="drivers"
                      title="Driver control"
                      description="Live GPS coverage, route inactivity, and direct access to the locator."
                      action={
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-white/10 bg-white/[0.05] text-white hover:translate-y-0 hover:bg-white/[0.08] hover:text-white hover:shadow-none"
                          >
                            <MapPinned className="h-4 w-4" />
                            Open locator
                          </Button>
                        </DialogTrigger>
                      }
                    >
                      <div className="grid gap-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">GPS coverage</p>
                            <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                              {formatPercent(gpsCoverageRate)}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/55">
                              {trackableDriverDeliveries.length} of {activeDeliveries.length || 0} active routes are trackable.
                            </p>
                          </div>
                          <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Route idle</p>
                            <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
                              {activeDeliveries.length ? formatMinutes(Math.round(averageActiveMinutes)) : "Clear"}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-white/55">
                              Longest idle route is {activeDeliveries.length ? formatMinutes(longestActiveMinutes) : "0 min"}.
                            </p>
                          </div>
                        </div>

                        {trackableDriverDeliveries.length ? (
                          trackableDriverDeliveries.slice(0, 3).map((delivery) => (
                            <div
                              key={`driver-preview-${delivery.id}`}
                              className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-white">
                                    {delivery.driver?.name ?? "Assigned courier"}
                                  </p>
                                  <p className="mt-1 text-sm text-white/55">
                                    Delivery #{delivery.id} • {formatStatusLabel(delivery.status)}
                                  </p>
                                </div>
                                <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/58">
                                  {formatMinutes(minutesSince(delivery.updatedAt))}
                                </div>
                              </div>
                              <p className="mt-3 truncate text-sm text-white/55">{delivery.pickupAddress}</p>
                              <p className="mt-1 truncate text-sm text-white/38">{delivery.dropoffAddress}</p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-white/58">
                            No drivers are currently in motion. Open routes will appear here once couriers accept work.
                          </div>
                        )}
                      </div>
                    </DashboardShell>

                    <DashboardShell
                      id="activity"
                      title="Audit trail"
                      description="Recent status transitions and who made them."
                      action={
                        <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/68">
                          {visibleLogs.length} recent
                        </div>
                      }
                    >
                      <div className="mb-4 flex flex-wrap gap-2">
                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/58">
                          {adminInterventions} admin interventions
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/58">
                          {driverTransitions} driver transitions
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/58">
                          {systemEvents} system events
                        </div>
                      </div>

                      <div className="space-y-3">
                        {visibleLogs.length ? (
                          visibleLogs.map((entry) => (
                            <div
                              key={entry.id}
                              className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold text-white">
                                    Delivery #{entry.deliveryId} moved to {formatStatusLabel(entry.status)}
                                  </p>
                                  <p className="mt-2 text-sm text-white/55">
                                    {entry.changedBy
                                      ? `${entry.changedBy.name} • ${formatStatusLabel(entry.changedBy.role)}`
                                      : "System event"}
                                  </p>
                                </div>
                                <StatusPill status={entry.status} />
                              </div>
                              {entry.note ? (
                                <p className="mt-3 text-sm leading-6 text-white/55">{entry.note}</p>
                              ) : null}
                              <p className="mt-4 text-xs uppercase tracking-[0.16em] text-white/34">
                                {formatOrderTime(entry.createdAt)}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-white/58">
                            No activity has been logged yet. Status transitions will appear here as deliveries move.
                          </div>
                        )}
                      </div>
                    </DashboardShell>
                  </section>
                </>
              ) : (
                <ErrorState description="Admin dashboard data is unavailable." />
              )}
            </div>
          </main>
        </div>
      </div>

      <DialogContent className="w-[min(96vw,82rem)] max-h-[92vh] overflow-hidden border border-black/10 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.08),transparent_20%),linear-gradient(180deg,#faf9f5_0%,#f1efeb_100%)] p-0 text-slate-900">
        <div className="border-b border-black/8 bg-white/72 px-6 py-5 backdrop-blur sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <DialogHeader className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Driver locator</p>
              <DialogTitle className="text-slate-950">Driver GPS and route activity</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-600">
                Each row uses the latest tracking snapshot for an active route, including coordinates,
                ETA, remaining distance, progress, and recent activity.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm text-slate-600">
                {trackableDriverDeliveries.length} trackable drivers
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocatorRefreshTick((value) => value + 1)}
                disabled={driverLocatorLoading}
                className="border-black/8 bg-white text-slate-800 hover:translate-y-0 hover:bg-slate-100 hover:shadow-none"
              >
                <RefreshCcw className={driverLocatorLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Refresh locations
              </Button>
            </div>
          </div>
        </div>

        <div className="max-h-[calc(92vh-136px)] overflow-y-auto px-6 pb-6 pt-5 sm:px-7">
          {driverLocatorError ? (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
              {driverLocatorError}
            </div>
          ) : null}

          {driverLocatorLoading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {Array.from({ length: Math.max(2, trackableDriverDeliveries.length || 0) }).map(
                (_, index) => (
                  <div
                    key={`driver-locator-skeleton-${index}`}
                    className="h-[520px] animate-pulse rounded-[30px] bg-[#dbd8d0]"
                  />
                )
              )}
            </div>
          ) : driverLocatorRecords.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {driverLocatorRecords.map((record) => {
                const idleMinutes = minutesSince(record.delivery.updatedAt);
                const tone = activeTone(idleMinutes);
                const styles = toneClasses(tone);

                return (
                  <div
                    key={`driver-locator-${record.delivery.id}`}
                    className="rounded-[30px] border border-white/8 bg-[#151515] p-5 text-white shadow-[0_24px_50px_rgba(0,0,0,0.22)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">Driver</p>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                          {record.delivery.driver?.name ?? "Assigned courier"}
                        </p>
                        <p className="mt-1 text-sm text-white/55">
                          {record.delivery.driver?.email ?? "No email available"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <div className={cn("rounded-full border px-3 py-1 text-xs", styles.badge)}>
                          {toneLabel(tone)}
                        </div>
                        <StatusPill status={record.delivery.status} />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className={cn("rounded-[22px] border p-4", styles.panel)}>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">ETA</p>
                            <p className="mt-2 text-lg font-semibold text-white">
                              {formatEtaSeconds(record.tracking.estimatedEtaSeconds)}
                            </p>
                          </div>
                          <div className={cn("rounded-[22px] border p-4", styles.panel)}>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Remaining</p>
                            <p className="mt-2 text-lg font-semibold text-white">
                              {formatDistanceKm(record.tracking.remainingDistanceKm)}
                            </p>
                          </div>
                          <div className={cn("rounded-[22px] border p-4", styles.panel)}>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Progress</p>
                            <p className="mt-2 text-lg font-semibold text-white">
                              {formatPercent(record.tracking.progress)}
                            </p>
                          </div>
                          <div className={cn("rounded-[22px] border p-4", styles.panel)}>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Last movement</p>
                            <p className="mt-2 text-lg font-semibold text-white">{formatMinutes(idleMinutes)}</p>
                          </div>
                        </div>

                        <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/58">
                              Delivery #{record.delivery.id}
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/58">
                              {formatOrderTime(record.delivery.updatedAt)}
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/58">
                              {record.tracking.points.length} route points
                            </div>
                          </div>
                          <p className="mt-4 text-sm leading-6 text-white/58">
                            {describeActivity(record.latestActivity)}
                          </p>
                          <div className="mt-4 rounded-[18px] border border-white/8 bg-black/20 p-3 text-sm text-white/58">
                            <p className="truncate">{record.delivery.pickupAddress}</p>
                            <p className="mt-1 truncate text-white/42">{record.delivery.dropoffAddress}</p>
                          </div>
                        </div>

                        <Button
                          asChild
                          variant="outline"
                          className="border-white/10 bg-white/[0.05] text-white hover:translate-y-0 hover:bg-white/[0.08] hover:text-white hover:shadow-none"
                        >
                          <a
                            href={`https://www.google.com/maps?q=${record.tracking.currentLatitude},${record.tracking.currentLongitude}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Navigation className="h-4 w-4" />
                            Open on map
                          </a>
                        </Button>
                      </div>

                      <DriverRouteMap tracking={record.tracking} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[30px] border border-dashed border-black/10 bg-white/70 p-6 text-sm leading-6 text-slate-600">
              {activeDeliveries.length
                ? "There are active routes, but none currently have a courier attached, so there is no live GPS position to locate."
                : "No drivers are currently in motion. Once a courier accepts a route, GPS location and activity will appear here."}
            </div>
          )}
        </div>
      </DialogContent>

      <Sheet
        open={Boolean(selectedDelivery)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDeliveryId(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-[96vw] max-w-[44rem] overflow-y-auto border-white/10 bg-[#121212] p-0 text-white"
        >
          {selectedDelivery ? (
            <div className="min-h-full">
              <div className="border-b border-white/10 px-6 py-5">
                <SheetHeader className="mb-0 pr-10">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/62">
                      Delivery desk
                    </div>
                    <StatusPill status={selectedDelivery.status} />
                  </div>
                  <SheetTitle className="mt-3 font-sans text-[1.7rem] font-semibold tracking-tight text-white">
                    Delivery #{selectedDelivery.id}
                  </SheetTitle>
                  <SheetDescription className="text-sm leading-6 text-white/58">
                    Use this panel to review live route details, assign a driver, and advance delivery status with audit notes.
                  </SheetDescription>
                </SheetHeader>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Customer</p>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {selectedDelivery.customer?.name ?? "Guest customer"}
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      {selectedDelivery.customer?.email ?? "No customer email"}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Courier</p>
                    <p className="mt-3 text-lg font-semibold text-white">
                      {selectedDelivery.driver?.name ?? "Unassigned"}
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      {selectedDelivery.driver?.email ?? "Awaiting assignment"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Total</p>
                    <p className="mt-3 text-xl font-semibold text-white">{selectedDelivery.priceDisplay}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Distance</p>
                    <p className="mt-3 text-xl font-semibold text-white">
                      {formatDistanceKm(selectedDelivery.estimatedDistanceKm)}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Updated</p>
                    <p className="mt-3 text-sm font-semibold text-white">
                      {formatOrderTime(selectedDelivery.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Route</p>
                  <p className="mt-3 text-sm text-white/62">{selectedDelivery.pickupAddress}</p>
                  <p className="mt-1 text-sm text-white/38">{selectedDelivery.dropoffAddress}</p>
                </div>

                {selectedDeliveryError ? (
                  <div className="rounded-[24px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {selectedDeliveryError}
                  </div>
                ) : null}

                {selectedDeliveryLoading ? (
                  <div className="h-[260px] animate-pulse rounded-[24px] bg-white/[0.06]" />
                ) : selectedDeliveryTracking ? (
                  <DriverRouteMap tracking={selectedDeliveryTracking} />
                ) : null}

                {selectedDelivery.status === "pending" && !selectedDelivery.driverId ? (
                  <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Assign driver</h3>
                        <p className="mt-1 text-sm leading-6 text-white/55">
                          Pending deliveries need a real courier assignment before they can move forward.
                        </p>
                      </div>
                      <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                        Pending
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/38">Driver</p>
                        <select
                          className={adminSelectClassName}
                          value={selectedDriverId}
                          onChange={(event) => setSelectedDriverId(event.target.value)}
                        >
                          <option value="">Select a driver</option>
                          {sortedDrivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.name} · {driver.activeDeliveries} active · {driver.completedDeliveries} completed
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/38">Audit note</p>
                        <Textarea
                          value={actionNote}
                          onChange={(event) => setActionNote(event.target.value)}
                          placeholder="Optional note explaining why this assignment was made."
                          className="min-h-[110px] border-white/10 bg-white/[0.06] text-white placeholder:text-white/35"
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={handleAssignSelectedDelivery}
                        disabled={actionState !== "idle" || !sortedDrivers.length}
                        className="bg-emerald-500 text-slate-950 hover:translate-y-0 hover:bg-emerald-400 hover:shadow-none"
                      >
                        {actionState === "assigning" ? "Assigning..." : "Assign driver"}
                      </Button>
                    </div>
                  </div>
                ) : selectedDeliveryNextStatus ? (
                  <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Advance delivery</h3>
                        <p className="mt-1 text-sm leading-6 text-white/55">
                          Move this order to the next allowed backend status and record an admin note.
                        </p>
                      </div>
                      <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                        Next: {formatStatusLabel(selectedDeliveryNextStatus)}
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/38">Audit note</p>
                        <Textarea
                          value={actionNote}
                          onChange={(event) => setActionNote(event.target.value)}
                          placeholder={`Optional note for moving this delivery to ${formatStatusLabel(selectedDeliveryNextStatus)}.`}
                          className="min-h-[110px] border-white/10 bg-white/[0.06] text-white placeholder:text-white/35"
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={handleAdvanceSelectedDelivery}
                        disabled={actionState !== "idle"}
                        className="bg-emerald-500 text-slate-950 hover:translate-y-0 hover:bg-emerald-400 hover:shadow-none"
                      >
                        {actionState === "updating"
                          ? "Updating..."
                          : `Move to ${formatStatusLabel(selectedDeliveryNextStatus)}`}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-white/58">
                    This delivery is already delivered. Use the timeline below for audit review.
                  </div>
                )}

                <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Status history</h3>
                      <p className="mt-1 text-sm text-white/55">Every backend transition recorded for this delivery.</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/62">
                      {selectedDeliveryHistory.length} events
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {selectedDeliveryHistory.length ? (
                      selectedDeliveryHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-[22px] border border-white/8 bg-black/20 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-white">{formatStatusLabel(entry.status)}</p>
                              <p className="mt-1 text-sm text-white/55">
                                {entry.changedBy
                                  ? `${entry.changedBy.name} • ${formatStatusLabel(entry.changedBy.role)}`
                                  : "System event"}
                              </p>
                            </div>
                            <p className="text-xs uppercase tracking-[0.16em] text-white/34">
                              {formatOrderTime(entry.createdAt)}
                            </p>
                          </div>
                          {entry.note ? (
                            <p className="mt-3 text-sm leading-6 text-white/58">{entry.note}</p>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/58">
                        No history is available for this delivery yet.
                      </div>
                    )}
                  </div>
                </div>

                {selectedDeliveryTracking ? (
                  <Button
                    asChild
                    variant="outline"
                    className="border-white/10 bg-white/[0.05] text-white hover:translate-y-0 hover:bg-white/[0.08] hover:text-white hover:shadow-none"
                  >
                    <a
                      href={`https://www.google.com/maps?q=${selectedDeliveryTracking.currentLatitude},${selectedDeliveryTracking.currentLongitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Navigation className="h-4 w-4" />
                      Open live position on map
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </Dialog>
  );
}
