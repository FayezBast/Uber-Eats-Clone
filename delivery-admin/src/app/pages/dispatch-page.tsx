import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, PauseCircle, RefreshCw, Siren } from "lucide-react";
import { toast } from "sonner";

import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/skeletons";
import { SidePanel } from "@/components/forms/side-panel";
import { StatusBadge } from "@/components/forms/status-badge";
import { PageHeader, PageHeaderAction } from "@/components/layout/page-header";
import { PermissionGuard } from "@/components/layout/permission-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DispatchMapPlaceholder } from "@/domains/dispatch/map-placeholder";
import { AssignCourierForm } from "@/domains/orders/assign-courier-form";
import { useDispatchRealtime } from "@/hooks/use-dispatch-realtime";
import { formatDateTime } from "@/lib/format";
import { couriersService } from "@/services/couriers-service";
import { dispatchService } from "@/services/dispatch-service";
import { ordersService } from "@/services/orders-service";
import { queryKeys } from "@/services/query-keys";

export function DispatchPage() {
  useDispatchRealtime();
  const queryClient = useQueryClient();
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const dispatchQuery = useQuery({
    queryKey: queryKeys.dispatch.board,
    queryFn: dispatchService.getDispatchSnapshot
  });
  const couriersQuery = useQuery({
    queryKey: queryKeys.couriers.list,
    queryFn: couriersService.listCouriers
  });
  const assignMutation = useMutation({
    mutationFn: ({ orderIds, courierId, note }: { orderIds: string[]; courierId: string; note?: string }) =>
      ordersService.assignCourier(orderIds, courierId, note),
    onSuccess: async () => {
      toast.success("Dispatch assignment updated");
      setAssignOpen(false);
      setSelectedOrderIds([]);
      await queryClient.invalidateQueries({ queryKey: queryKeys.dispatch.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    }
  });
  const pauseMutation = useMutation({
    mutationFn: dispatchService.pauseCourier,
    onSuccess: async () => {
      toast.success("Courier paused");
      await queryClient.invalidateQueries({ queryKey: queryKeys.dispatch.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.couriers.all });
    }
  });
  const incidentMutation = useMutation({
    mutationFn: ({ orderId, issue }: { orderId: string; issue: string }) => dispatchService.flagDeliveryIncident(orderId, issue),
    onSuccess: async () => {
      toast.success("Delivery incident logged");
      await queryClient.invalidateQueries({ queryKey: queryKeys.dispatch.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.support.all });
    }
  });

  const allOrders = useMemo(
    () => [
      ...(dispatchQuery.data?.unassignedOrders ?? []),
      ...(dispatchQuery.data?.pickingUpOrders ?? []),
      ...(dispatchQuery.data?.onTheWayOrders ?? []),
      ...(dispatchQuery.data?.delayedOrders ?? []),
      ...(dispatchQuery.data?.failedOrders ?? [])
    ],
    [dispatchQuery.data]
  );

  function toggleSelected(orderId: string) {
    setSelectedOrderIds((current) => (current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]));
  }

  if (dispatchQuery.isError) {
    return <ErrorState description="The live dispatch board could not be loaded." onRetry={() => dispatchQuery.refetch()} title="Dispatch unavailable" />;
  }

  return (
    <PermissionGuard permission="dispatch:view">
      <div className="space-y-6">
        <PageHeader
          primaryAction={
            <PageHeaderAction onClick={() => dispatchQuery.refetch()} variant="outline">
              <RefreshCw className="h-4 w-4" />
              Refresh board
            </PageHeaderAction>
          }
          secondaryAction={
            selectedOrderIds.length ? (
              <PageHeaderAction onClick={() => setAssignOpen(true)}>
                Bulk assign ({selectedOrderIds.length})
              </PageHeaderAction>
            ) : null
          }
          subtitle="Real-time order assignment, courier balancing, delay management, and incident response."
          title="Live dispatch"
        >
          {dispatchQuery.data ? <p className="text-sm text-muted-foreground">Last sync: {formatDateTime(dispatchQuery.data.lastUpdatedAt)}</p> : null}
        </PageHeader>

        {dispatchQuery.isLoading || !dispatchQuery.data ? (
          <TableSkeleton rows={8} />
        ) : (
          <div className="grid gap-4 2xl:grid-cols-[1.5fr,0.95fr]">
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-5">
                <DispatchColumn
                  onFlagIssue={(orderId) => incidentMutation.mutate({ orderId, issue: "Dispatch flagged delay or reassignment incident." })}
                  onSelect={toggleSelected}
                  selectedOrderIds={selectedOrderIds}
                  title="Unassigned"
                  orders={dispatchQuery.data.unassignedOrders}
                />
                <DispatchColumn
                  onFlagIssue={(orderId) => incidentMutation.mutate({ orderId, issue: "Pickup flow exception requires review." })}
                  title="Picking up"
                  orders={dispatchQuery.data.pickingUpOrders}
                />
                <DispatchColumn
                  onFlagIssue={(orderId) => incidentMutation.mutate({ orderId, issue: "On-the-way delivery incident opened." })}
                  title="On the way"
                  orders={dispatchQuery.data.onTheWayOrders}
                />
                <DispatchColumn
                  onFlagIssue={(orderId) => incidentMutation.mutate({ orderId, issue: "Delayed delivery requires operator intervention." })}
                  onSelect={toggleSelected}
                  selectedOrderIds={selectedOrderIds}
                  title="Delayed"
                  tone="warning"
                  orders={dispatchQuery.data.delayedOrders}
                />
                <DispatchColumn
                  onFlagIssue={(orderId) => incidentMutation.mutate({ orderId, issue: "Failed delivery incident logged from dispatch board." })}
                  title="Failed"
                  tone="danger"
                  orders={dispatchQuery.data.failedOrders}
                />
              </div>

              <DispatchMapPlaceholder orders={allOrders} />
            </div>

            <Card>
              <CardHeader>
                <div className="space-y-1">
                  <CardTitle>Courier roster</CardTitle>
                  <p className="text-sm text-muted-foreground">Online state, capacity, active tasks, and performance quality.</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {dispatchQuery.data.couriers.map((courier) => (
                  <div key={courier.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{courier.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {courier.city} · {courier.zone} · {courier.vehicleType}
                        </p>
                      </div>
                      <StatusBadge status={courier.status} />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <span>Capacity: {courier.currentCapacity}</span>
                      <span>Tasks: {courier.activeTasks}</span>
                      <span>Acceptance: {courier.acceptanceRate}%</span>
                      <span>Completion: {courier.completionRate}%</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button disabled={!selectedOrderIds.length} onClick={() => setAssignOpen(true)} size="sm" variant="outline">
                        Assign
                      </Button>
                      <Button onClick={() => pauseMutation.mutate(courier.id)} size="sm" variant="outline">
                        <PauseCircle className="h-4 w-4" />
                        Pause
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        <SidePanel
          description="Assign selected deliveries to an available courier."
          onClose={() => setAssignOpen(false)}
          open={assignOpen}
          title="Bulk courier assignment"
        >
          <AssignCourierForm
            couriers={couriersQuery.data ?? []}
            loading={assignMutation.isPending}
            onSubmit={async (values) => {
              await assignMutation.mutateAsync({
                orderIds: selectedOrderIds,
                courierId: values.courierId,
                note: values.note
              });
            }}
          />
        </SidePanel>
      </div>
    </PermissionGuard>
  );
}

function DispatchColumn({
  title,
  orders,
  tone = "default",
  selectedOrderIds,
  onSelect,
  onFlagIssue
}: {
  title: string;
  orders: Array<{
    id: string;
    externalId: string;
    customer: { name: string };
    store: { name: string };
    courier?: { name: string };
    status: string;
    promisedAt: string;
    issueFlags: string[];
  }>;
  tone?: "default" | "warning" | "danger";
  selectedOrderIds?: string[];
  onSelect?: (orderId: string) => void;
  onFlagIssue: (orderId: string) => void;
}) {
  return (
    <Card className={tone === "warning" ? "border-warning/30" : tone === "danger" ? "border-destructive/30" : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <StatusBadge label={`${orders.length} orders`} status={tone === "danger" ? "failed" : tone === "warning" ? "pending" : "assigned"} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {orders.length ? (
          orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{order.externalId}</p>
                  <p className="text-sm text-muted-foreground">{order.customer.name}</p>
                  <p className="text-xs text-muted-foreground">{order.store.name}</p>
                </div>
                {onSelect ? (
                  <input checked={selectedOrderIds?.includes(order.id)} onChange={() => onSelect(order.id)} type="checkbox" />
                ) : null}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  Promised {formatDateTime(order.promisedAt)}
                </span>
                <StatusBadge status={order.status} />
              </div>
              {order.issueFlags.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {order.issueFlags.map((flag) => (
                    <StatusBadge key={flag} label={flag.replace(/_/g, " ")} status="warning" />
                  ))}
                </div>
              ) : null}
              <div className="mt-3 flex gap-2">
                <Button onClick={() => onFlagIssue(order.id)} size="sm" variant="outline">
                  <Siren className="h-4 w-4" />
                  Flag
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No orders in this queue.</p>
        )}
      </CardContent>
    </Card>
  );
}
