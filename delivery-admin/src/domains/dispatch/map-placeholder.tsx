import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrderRecord } from "@/types";

export function DispatchMapPlaceholder({ orders }: { orders: OrderRecord[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="space-y-1">
          <CardTitle>Live map</CardTitle>
          <CardDescription>Placeholder structure for map SDK integration and courier markers.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-[24rem] overflow-hidden rounded-2xl border border-border bg-grid-fade bg-[size:32px_32px] bg-card">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.16),transparent_28%)]" />
          {orders.slice(0, 8).map((order, index) => (
            <div
              key={order.id}
              className="absolute flex h-8 w-8 items-center justify-center rounded-full border border-info/30 bg-info/15 text-xs font-semibold text-info"
              style={{
                left: `${12 + (index % 4) * 20}%`,
                top: `${18 + Math.floor(index / 2) * 16}%`
              }}
            >
              {index + 1}
            </div>
          ))}
          <div className="absolute bottom-4 left-4 rounded-xl border border-border bg-background/90 px-3 py-2 text-xs text-muted-foreground">
            Courier / order markers, heat layers, and zone polygons plug in here.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
