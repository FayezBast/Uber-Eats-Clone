import { Bike, Clock3, MapPinned } from "lucide-react";

import { StatusTimeline } from "@/components/orders/status-timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatOrderTime } from "@/lib/format";
import type { Order } from "@/types";

interface OrderTrackerProps {
  order: Order;
}

const statusMessages: Record<Order["status"], string> = {
  placed: "The kitchen has received the order and is lining up prep.",
  accepted: "Your restaurant confirmed the ticket and queued it for the line.",
  preparing: "The order is being plated now and timed for handoff.",
  ready: "Everything is packed and waiting for the courier or pickup handoff.",
  on_the_way: "Your courier is in motion and heading toward the drop-off.",
  delivered: "The order reached the destination and the flow is complete."
};

export function OrderTracker({ order }: OrderTrackerProps) {
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
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="frost-panel p-4">
              <Clock3 className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">ETA</p>
              <p className="mt-1 font-semibold">{order.etaMinutes} min</p>
            </div>
            <div className="frost-panel p-4">
              <Bike className="mb-2 h-5 w-5 text-primary" />
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Mode</p>
              <p className="mt-1 font-semibold capitalize">{order.deliveryMode}</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Courier note</p>
            <p className="mt-2 text-sm leading-6 text-foreground">{statusMessages[order.status]}</p>
          </div>
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
        <div className="frost-panel p-5">
          <h3 className="mb-3 font-semibold">Status timeline</h3>
          <StatusTimeline events={order.timeline} />
        </div>
      </CardContent>
    </Card>
  );
}
