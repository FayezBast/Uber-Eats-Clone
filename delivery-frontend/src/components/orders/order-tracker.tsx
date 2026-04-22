import { Activity, Clock3, MapPinned, Navigation, Route } from "lucide-react";

import { StatusTimeline } from "@/components/orders/status-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCurrency,
  formatDistanceKm,
  formatEtaSeconds,
  formatOrderTime,
  formatStatusLabel
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Order, TrackingSnapshot } from "@/types";

interface OrderTrackerProps {
  order: Order;
  trackingError?: string;
}

interface MapPlotPoint {
  id: string;
  left: number;
  top: number;
  current: boolean;
}

const statusMessages: Record<Order["status"], string> = {
  placed: "The kitchen has received the order and is lining up prep.",
  accepted: "Your restaurant confirmed the ticket and queued it for the line.",
  preparing: "The order is being plated now and timed for handoff.",
  ready: "Everything is packed and waiting for the courier or pickup handoff.",
  on_the_way: "Your courier is in motion and heading toward the drop-off.",
  delivered: "The order reached the destination and the flow is complete."
};

function formatProgress(value: number) {
  return `${Math.round(value * 100)}%`;
}

function buildMapPlotPoints(tracking: TrackingSnapshot): MapPlotPoint[] {
  const points = [
    ...tracking.points.map((point) => ({
      id: `history-${point.id}`,
      latitude: point.latitude,
      longitude: point.longitude,
      current: false
    })),
    {
      id: "current",
      latitude: tracking.currentLatitude,
      longitude: tracking.currentLongitude,
      current: true
    }
  ];

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

function LiveTrackingMap({ tracking }: { tracking: TrackingSnapshot }) {
  const plotPoints = buildMapPlotPoints(tracking);

  return (
    <div className="relative h-[260px] overflow-hidden rounded-[26px] border border-slate-200 bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,197,143,0.24),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(112,152,122,0.2),transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:52px_52px]" />
      <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/76">
        Live courier route
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
                ? "h-4 w-4 border-4 border-slate-950 bg-primary shadow-[0_0_0_12px_rgba(217,119,6,0.2)]"
                : "h-2.5 w-2.5 bg-white/45"
            )}
          />
        </div>
      ))}
      <div className="absolute inset-x-4 bottom-4 rounded-[18px] border border-white/10 bg-slate-950/78 p-4 backdrop-blur">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/46">ETA</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {formatEtaSeconds(tracking.estimatedEtaSeconds)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/46">Remaining</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {formatDistanceKm(tracking.remainingDistanceKm)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderTracker({ order, trackingError = "" }: OrderTrackerProps) {
  const lastTrackingPoint = order.tracking?.points[order.tracking.points.length - 1];
  const lastUpdatedAt = lastTrackingPoint?.createdAt ?? order.delivery?.updatedAt ?? order.placedAt;
  const trackingHref = order.tracking
    ? `https://www.google.com/maps?q=${order.tracking.currentLatitude},${order.tracking.currentLongitude}`
    : "";

  return (
    <Card className="overflow-hidden bg-white/85">
      <CardHeader className="relative border-b border-border/70 bg-surface/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,197,143,0.26),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(112,152,122,0.18),transparent_26%)]" />
        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="success" className="mb-3 w-fit capitalize">
              {order.status.replaceAll("_", " ")}
            </Badge>
            <CardTitle>{order.restaurantName}</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Ordered {formatOrderTime(order.placedAt)} • {formatCurrency(order.total)}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="frost-panel p-4">
              <Clock3 className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">ETA</p>
              <p className="mt-1 font-semibold">
                {order.tracking ? formatEtaSeconds(order.tracking.estimatedEtaSeconds) : `${order.etaMinutes} min`}
              </p>
            </div>
            <div className="frost-panel p-4">
              <Route className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Remaining</p>
              <p className="mt-1 font-semibold">
                {order.tracking ? formatDistanceKm(order.tracking.remainingDistanceKm) : "Awaiting route"}
              </p>
            </div>
            <div className="frost-panel p-4">
              <Activity className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Progress</p>
              <p className="mt-1 font-semibold">
                {order.tracking ? formatProgress(order.tracking.progress) : formatStatusLabel(order.status)}
              </p>
            </div>
            <div className="frost-panel p-4">
              <MapPinned className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Address</p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold">{order.address.line1}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-8 pt-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="frost-panel p-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {order.tracking ? "Live tracking" : "Courier note"}
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">{statusMessages[order.status]}</p>
              </div>
              {order.tracking ? (
                <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                  Refreshes every 10s
                </Badge>
              ) : null}
            </div>
            <p className="mt-3 text-sm">
              {trackingError && order.tracking
                ? `Showing the latest synced route. ${trackingError}`
                : trackingError || `Last update ${formatOrderTime(lastUpdatedAt)}`}
            </p>
          </div>
          {order.tracking ? <LiveTrackingMap tracking={order.tracking} /> : null}
          <div className="space-y-3">
            <h3 className="font-semibold">Items in this order</h3>
            <div className="space-y-2">
              {order.itemsSummary.map((item) => (
                <div
                  key={item}
                  className="rounded-[20px] border border-border/70 bg-white/74 px-4 py-3 text-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="frost-panel p-5">
            <h3 className="mb-3 font-semibold">Status timeline</h3>
            <StatusTimeline events={order.timeline} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-border/70 bg-white/74 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Courier</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {order.delivery?.driver?.name ?? "Dispatching courier"}
              </p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-white/74 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Delivery mode</p>
              <p className="mt-2 text-sm font-semibold capitalize text-foreground">{order.deliveryMode}</p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-white/74 p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Route</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {order.delivery?.pickupAddress ?? order.restaurantName}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Heading to {order.delivery?.dropoffAddress ?? order.address.line1}
              </p>
            </div>
            {trackingHref ? (
              <Button asChild variant="outline" className="sm:col-span-2">
                <a href={trackingHref} target="_blank" rel="noreferrer">
                  <Navigation className="mr-2 h-4 w-4" />
                  Open live courier location
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
