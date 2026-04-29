import { CircleAlert, MapPinned, NotebookTabs, Phone, ReceiptText, UserRound } from "lucide-react";

import { StatusBadge } from "@/components/forms/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, SectionCard } from "@/components/ui/card";
import { formatCurrency, formatDateTime, formatDurationMinutes, formatPhone } from "@/lib/format";
import type { OrderDetail } from "@/types";

export function OrderDetailPanel({ order }: { order: OrderDetail }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="space-y-1">
              <CardTitle>Order summary</CardTitle>
              <CardDescription>{order.externalId}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={order.status} />
              <StatusBadge status={order.paymentStatus} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Created" value={formatDateTime(order.createdAt)} />
            <DetailRow label="ETA" value={formatDateTime(order.etaAt)} />
            <DetailRow label="Order type" value={order.orderType} />
            <DetailRow label="Prep target" value={formatDurationMinutes(order.averagePrepTimeMinutes)} />
            <DetailRow label="Delivery target" value={formatDurationMinutes(order.averageDeliveryTimeMinutes)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="space-y-1">
              <CardTitle>Contacts</CardTitle>
              <CardDescription>Customer, store, courier</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ContactCard icon={UserRound} title={order.customer.name} subtitle={order.customer.email} phone={order.customer.phone} />
            <ContactCard icon={ReceiptText} title={order.store.name} subtitle={`${order.store.brand} · ${order.store.zone}`} />
            {order.courier ? <ContactCard icon={MapPinned} title={order.courier.name} subtitle={`${order.courier.vehicleType} · ${order.courier.zone}`} phone={order.courier.phone} /> : <p className="text-sm text-muted-foreground">No courier assigned yet.</p>}
          </CardContent>
        </Card>
      </div>

      <SectionCard description="Operational state changes and handoffs." title="Timeline">
        <div className="space-y-4">
          {order.timeline.map((event) => (
            <div key={event.id} className="flex gap-3">
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-accent" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{event.title}</p>
                  <StatusBadge status={event.status} />
                </div>
                <p className="text-sm text-muted-foreground">{event.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(event.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
        <SectionCard description="Items, pricing, and issue flags." title="Commercial detail">
          <div className="space-y-5">
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 rounded-xl border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {item.quantity}× {item.name}
                    </p>
                    {item.modifiers?.length ? <p className="text-sm text-muted-foreground">{item.modifiers.join(" · ")}</p> : null}
                  </div>
                  <p className="text-sm font-medium">{formatCurrency(item.unitPrice * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2 rounded-xl bg-muted/50 p-4">
              <DetailRow label="Subtotal" value={formatCurrency(order.pricing.subtotal)} />
              <DetailRow label="Delivery fee" value={formatCurrency(order.pricing.deliveryFee)} />
              <DetailRow label="Service fee" value={formatCurrency(order.pricing.serviceFee)} />
              <DetailRow label="Tax" value={formatCurrency(order.pricing.tax)} />
              <DetailRow label="Discount" value={`-${formatCurrency(order.pricing.discount)}`} />
              <DetailRow label="Tip" value={formatCurrency(order.pricing.tip)} />
              <div className="border-t border-border pt-2">
                <DetailRow label="Total" value={formatCurrency(order.pricing.total)} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Issue flags</p>
              <div className="flex flex-wrap gap-2">
                {order.issueFlags.length ? order.issueFlags.map((flag) => <StatusBadge key={flag} label={flag.replace(/_/g, " ")} status="warning" />) : <p className="text-sm text-muted-foreground">No issue flags.</p>}
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard description="Drop-off location and access notes." title="Delivery address">
            <div className="space-y-2 text-sm">
              <p className="font-medium">{order.deliveryAddress.line1}</p>
              <p className="text-muted-foreground">
                {order.deliveryAddress.area}, {order.deliveryAddress.zone}, {order.deliveryAddress.city}
              </p>
              {order.deliveryAddress.instructions ? <p className="text-muted-foreground">{order.deliveryAddress.instructions}</p> : null}
            </div>
          </SectionCard>

          <SectionCard description="Support notes and operator context." title="Support notes">
            <div className="space-y-3">
              {order.supportNotes.length ? (
                order.supportNotes.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{entry.author}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{entry.body}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No support notes recorded.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard description="Admin and automated action history." title="Audit log">
            <div className="space-y-3">
              {order.auditLogs.length ? (
                order.auditLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2">
                      <CircleAlert className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">{log.action}</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{log.actorName}</p>
                    {log.note ? <p className="mt-2 text-sm text-muted-foreground">{log.note}</p> : null}
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(log.timestamp)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No audit history for this order yet.</p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ContactCard({
  icon: Icon,
  title,
  subtitle,
  phone
}: {
  icon: typeof UserRound;
  title: string;
  subtitle: string;
  phone?: string;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-muted p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
          {phone ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              {formatPhone(phone)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
