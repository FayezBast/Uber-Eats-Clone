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
import { formatCurrency, formatDateTime, formatPercent } from "@/lib/format";
import { queryKeys } from "@/services/query-keys";
import { storesService } from "@/services/stores-service";

export function StoreDetailPage() {
  const { storeId = "" } = useParams();
  const queryClient = useQueryClient();
  const storeQuery = useQuery({
    queryKey: queryKeys.stores.detail(storeId),
    queryFn: () => storesService.getStoreDetail(storeId)
  });
  const statusMutation = useMutation({
    mutationFn: ({ storeId, status }: { storeId: string; status: "online" | "busy" | "offline" | "disabled" }) =>
      storesService.updateStoreStatus(storeId, status),
    onSuccess: async () => {
      toast.success("Store status updated");
      await queryClient.invalidateQueries({ queryKey: queryKeys.stores.all });
    }
  });
  const prepMutation = useMutation({
    mutationFn: ({ storeId, averagePrepTimeMinutes }: { storeId: string; averagePrepTimeMinutes: number }) =>
      storesService.adjustPrepTime(storeId, averagePrepTimeMinutes),
    onSuccess: async () => {
      toast.success("Prep time updated");
      await queryClient.invalidateQueries({ queryKey: queryKeys.stores.detail(storeId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.stores.all });
    }
  });

  if (storeQuery.isError) {
    return <ErrorState description="This store could not be loaded." onRetry={() => storeQuery.refetch()} title="Store unavailable" />;
  }

  if (storeQuery.isLoading || !storeQuery.data) {
    return <TableSkeleton rows={8} />;
  }

  const store = storeQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        primaryAction={
          <PageHeaderAction onClick={() => statusMutation.mutate({ storeId: store.id, status: store.status === "online" ? "offline" : "online" })} variant="outline">
            {store.status === "online" ? "Mark offline" : "Enable store"}
          </PageHeaderAction>
        }
        secondaryAction={
          <PageHeaderAction onClick={() => statusMutation.mutate({ storeId: store.id, status: "busy" })} variant="outline">
            Mark busy
          </PageHeaderAction>
        }
        subtitle={`${store.brand} · ${store.city} / ${store.zone}`}
        title={store.name}
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr,1fr]">
        <SectionCard description="Merchant profile, location, and operating configuration." title="Profile">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <DetailRow label="Status" value={<StatusBadge status={store.status} />} />
            <DetailRow label="Menu sync" value={<StatusBadge status={store.menuSyncStatus} />} />
            <DetailRow label="Rating" value={store.rating.toFixed(1)} />
            <DetailRow label="Opening hours" value={store.openingHours} />
            <DetailRow label="Commission plan" value={store.commissionPlan} />
            <DetailRow label="Service area" value={store.serviceArea.join(", ")} />
            <DetailRow label="Temporary closure" value={store.temporaryClosureReason ?? "None"} />
          </div>
        </SectionCard>

        <SectionCard description="Prep, cancellations, complaints, and payout balance." title="Performance">
          <div className="space-y-3 text-sm">
            <DetailRow label="Average prep time" value={`${store.averagePrepTimeMinutes} min`} />
            <DetailRow label="Cancellation rate" value={formatPercent(store.cancellationRate)} />
            <DetailRow label="Complaints last 30d" value={String(store.complaintsLast30Days)} />
            <DetailRow label="Payout balance" value={formatCurrency(store.payoutBalance)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => prepMutation.mutate({ storeId: store.id, averagePrepTimeMinutes: store.averagePrepTimeMinutes + 2 })} size="sm" variant="outline">
              Increase prep +2m
            </Button>
            <Button onClick={() => prepMutation.mutate({ storeId: store.id, averagePrepTimeMinutes: Math.max(5, store.averagePrepTimeMinutes - 2) })} size="sm" variant="outline">
              Reduce prep -2m
            </Button>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr,1fr,1fr]">
        <SectionCard description="Open complaints and merchant-linked incidents." title="Recent complaints">
          <div className="space-y-3">
            {store.recentComplaints.length ? (
              store.recentComplaints.map((ticket) => (
                <div key={ticket.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{ticket.subject}</p>
                    <StatusBadge status={ticket.priority} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{ticket.type.replace(/_/g, " ")}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(ticket.updatedAt)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No open complaint activity.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard description="Recent orders routed through this merchant." title="Recent orders">
          <div className="space-y-3">
            {store.recentOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{order.externalId}</p>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{order.customer.name}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard description="Upcoming and recent settlement records." title="Payout summary">
          <div className="space-y-3">
            {store.payoutSummary.map((payout) => (
              <div key={payout.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{formatCurrency(payout.amount)}</p>
                  <StatusBadge status={payout.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(payout.periodStart)} to {formatDateTime(payout.periodEnd)}
                </p>
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
