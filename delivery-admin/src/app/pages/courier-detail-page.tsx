import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/skeletons";
import { StatusBadge } from "@/components/forms/status-badge";
import { PageHeader, PageHeaderAction } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { couriersService } from "@/services/couriers-service";
import { queryKeys } from "@/services/query-keys";

export function CourierDetailPage() {
  const { courierId = "" } = useParams();
  const queryClient = useQueryClient();
  const courierQuery = useQuery({
    queryKey: queryKeys.couriers.detail(courierId),
    queryFn: () => couriersService.getCourierDetail(courierId)
  });
  const statusMutation = useMutation({
    mutationFn: ({ courierId, status }: { courierId: string; status: "online" | "offline" | "paused" | "busy" | "suspended" }) =>
      couriersService.updateCourierStatus(courierId, status),
    onSuccess: async () => {
      toast.success("Courier status updated");
      await queryClient.invalidateQueries({ queryKey: queryKeys.couriers.all });
    }
  });
  const zoneMutation = useMutation({
    mutationFn: ({ courierId, zone }: { courierId: string; zone: string }) => couriersService.changeCourierZone(courierId, zone),
    onSuccess: async () => {
      toast.success("Courier zone updated");
      await queryClient.invalidateQueries({ queryKey: queryKeys.couriers.detail(courierId) });
    }
  });

  if (courierQuery.isError) {
    return <ErrorState description="This courier profile could not be loaded." onRetry={() => courierQuery.refetch()} title="Courier unavailable" />;
  }

  if (courierQuery.isLoading || !courierQuery.data) {
    return <TableSkeleton rows={8} />;
  }

  const courier = courierQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        primaryAction={
          <PageHeaderAction onClick={() => statusMutation.mutate({ courierId: courier.id, status: courier.status === "suspended" ? "online" : "suspended" })} variant="outline">
            {courier.status === "suspended" ? "Reactivate courier" : "Suspend account"}
          </PageHeaderAction>
        }
        secondaryAction={
          <PageHeaderAction onClick={() => toast.success("Courier notification queued")} variant="outline">
            Send notification
          </PageHeaderAction>
        }
        subtitle={`${courier.city} / ${courier.zone} · ${courier.vehicleType}`}
        title={courier.name}
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr,1fr]">
        <SectionCard description="Operational status, route profile, and quality indicators." title="Courier profile">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <DetailRow label="Status" value={<StatusBadge status={courier.status} />} />
            <DetailRow label="Vehicle" value={courier.vehicleType} />
            <DetailRow label="Zone" value={courier.zone} />
            <DetailRow label="Performance score" value={`${courier.performanceScore}`} />
            <DetailRow label="Late rate" value={`${courier.lateRate}%`} />
            <DetailRow label="Completed deliveries" value={`${courier.completedDeliveries}`} />
            <DetailRow label="Earnings today" value={formatCurrency(courier.earningsToday)} />
            <DetailRow label="Incidents" value={`${courier.incidentCount}`} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Hamra", "Verdun", "Marina", "Palm", "Olaya", "Tahlia"].map((zone) => (
              <Button key={zone} onClick={() => zoneMutation.mutate({ courierId: courier.id, zone })} size="sm" variant="outline">
                Move to {zone}
              </Button>
            ))}
          </div>
        </SectionCard>

        <SectionCard description="Compliance and onboarding document review." title="Documents">
          <div className="space-y-3">
            {courier.documents.map((document) => (
              <div key={document.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{document.name}</p>
                    {document.expiresAt ? <p className="text-xs text-muted-foreground">Expires {formatDateTime(document.expiresAt)}</p> : null}
                  </div>
                  <StatusBadge status={document.status} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr,1fr,1fr]">
        <SectionCard description="Current active orders assigned to this courier." title="Active orders">
          <div className="space-y-3">
            {courier.activeOrders.length ? (
              courier.activeOrders.map((order) => (
                <div key={order.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{order.externalId}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{order.store.name}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No active orders currently assigned.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard description="Courier-linked incidents and support escalations." title="Incident history">
          <div className="space-y-3">
            {courier.incidentHistory.map((incident) => (
              <div key={incident.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{incident.subject}</p>
                  <StatusBadge status={incident.priority} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(incident.updatedAt)}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard description="Settlement records available to courier ops and finance." title="Payout history">
          <div className="space-y-3">
            {courier.payoutHistory.map((payout) => (
              <div key={payout.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{formatCurrency(payout.amount)}</p>
                  <StatusBadge status={payout.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(payout.scheduledAt)}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
