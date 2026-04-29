import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, Flag, Receipt, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/skeletons";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { FilterBar } from "@/components/forms/filter-bar";
import { SidePanel } from "@/components/forms/side-panel";
import { StatusBadge } from "@/components/forms/status-badge";
import { PageHeader, PageHeaderAction } from "@/components/layout/page-header";
import { PermissionGuard } from "@/components/layout/permission-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { couriersService } from "@/services/couriers-service";
import { ordersService } from "@/services/orders-service";
import { queryKeys } from "@/services/query-keys";
import { storesService } from "@/services/stores-service";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useOrderFilters } from "@/hooks/use-order-filters";
import { AssignCourierForm } from "@/domains/orders/assign-courier-form";
import { OrderDetailPanel } from "@/domains/orders/order-detail-panel";
import type { OrderRecord } from "@/types";

export function OrdersPage() {
  const queryClient = useQueryClient();
  const { filters, updateFilters } = useOrderFilters();
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [assignTargetIds, setAssignTargetIds] = useState<string[] | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderRecord | null>(null);

  const ordersQuery = useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => ordersService.listOrders(filters)
  });
  const orderDetailQuery = useQuery({
    queryKey: queryKeys.orders.detail(selectedOrderId ?? "none"),
    queryFn: () => ordersService.getOrderDetail(selectedOrderId!),
    enabled: Boolean(selectedOrderId)
  });
  const storesQuery = useQuery({
    queryKey: queryKeys.stores.list,
    queryFn: storesService.listStores
  });
  const couriersQuery = useQuery({
    queryKey: queryKeys.couriers.list,
    queryFn: couriersService.listCouriers
  });

  const assignMutation = useMutation({
    mutationFn: ({ orderIds, courierId, note }: { orderIds: string[]; courierId: string; note?: string }) =>
      ordersService.assignCourier(orderIds, courierId, note),
    onSuccess: async () => {
      toast.success("Courier assignment updated");
      setAssignTargetIds(null);
      setRowSelection({});
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dispatch.all });
    }
  });
  const refundMutation = useMutation({
    mutationFn: (order: OrderRecord) => ordersService.refundOrder(order.id, Math.min(order.amount, 5), "Operator-issued goodwill refund"),
    onSuccess: async () => {
      toast.success("Refund request created");
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.finance.overview });
    }
  });
  const issueMutation = useMutation({
    mutationFn: (orderId: string) => ordersService.markIssue(orderId, "Operator flagged issue for follow-up."),
    onSuccess: async () => {
      toast.success("Issue flag added");
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    }
  });
  const cancelMutation = useMutation({
    mutationFn: (orderId: string) => ordersService.cancelOrder(orderId, "Canceled by operations during manual review."),
    onSuccess: async () => {
      toast.success("Order canceled");
      setCancelTarget(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dispatch.all });
    }
  });

  const selectedIds = Object.entries(rowSelection)
    .filter(([, value]) => value)
    .map(([id]) => id);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => !["page", "pageSize", "sortBy", "sortDirection", "search"].includes(key) && Boolean(value)).length;

  const columns = useMemo<ColumnDef<OrderRecord>[]>(
    () => [
      {
        header: "Order ID",
        accessorKey: "externalId",
        cell: ({ row }) => (
          <button className="text-left text-sm font-medium text-accent" onClick={() => setSelectedOrderId(row.original.id)} type="button">
            {row.original.externalId}
          </button>
        )
      },
      {
        header: "Customer",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.customer.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.customer.phone}</p>
          </div>
        )
      },
      {
        header: "Store",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.store.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.store.brand}</p>
          </div>
        )
      },
      {
        header: "Courier",
        cell: ({ row }) =>
          row.original.courier ? (
            <div>
              <p className="font-medium">{row.original.courier.name}</p>
              <p className="text-xs text-muted-foreground">{row.original.courier.zone}</p>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Unassigned</span>
          )
      },
      {
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />
      },
      {
        header: "Payment",
        cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} />
      },
      {
        header: "Amount",
        cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.amount)}</span>
      },
      {
        header: "City / Zone",
        cell: ({ row }) => (
          <div>
            <p>{row.original.city}</p>
            <p className="text-xs text-muted-foreground">{row.original.zone}</p>
          </div>
        )
      },
      {
        header: "Created",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDateTime(row.original.createdAt)}</span>
      },
      {
        header: "ETA",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDateTime(row.original.etaAt)}</span>
      },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setSelectedOrderId(row.original.id)} size="sm" variant="outline">
              <Eye className="h-4 w-4" />
            </Button>
            <Button onClick={() => setAssignTargetIds([row.original.id])} size="sm" variant="outline">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button onClick={() => issueMutation.mutate(row.original.id)} size="sm" variant="outline">
              <Flag className="h-4 w-4" />
            </Button>
            <Button onClick={() => refundMutation.mutate(row.original)} size="sm" variant="outline">
              <Receipt className="h-4 w-4" />
            </Button>
            <Button onClick={() => setCancelTarget(row.original)} size="sm" variant="outline">
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        )
      }
    ],
    [issueMutation, refundMutation]
  );

  return (
    <PermissionGuard permission="orders:view">
      <div className="space-y-6">
        <PageHeader
          primaryAction={
            <PageHeaderAction onClick={() => toast.success("Order export queued")} variant="outline">
              Export
            </PageHeaderAction>
          }
          secondaryAction={
            selectedIds.length ? (
              <PageHeaderAction onClick={() => setAssignTargetIds(selectedIds)} variant="default">
                Bulk assign ({selectedIds.length})
              </PageHeaderAction>
            ) : null
          }
          subtitle="Searchable, paginated order operations table with courier assignment, issue handling, refunds, and cancellation workflows."
          title="Orders management"
        >
          <FilterBar
            actions={
              <Button
                onClick={() =>
                  updateFilters({
                    search: "",
                    city: undefined,
                    zone: undefined,
                    status: undefined,
                    paymentStatus: undefined,
                    storeId: undefined,
                    courierId: undefined,
                    orderType: undefined,
                    startDate: undefined,
                    endDate: undefined
                  })
                }
                variant="ghost"
              >
                Clear filters
              </Button>
            }
            activeCount={activeFilterCount}
          >
            <Input onChange={(event) => updateFilters({ search: event.target.value })} placeholder="Search by ID, customer, store, courier" value={filters.search} />
            <Input onChange={(event) => updateFilters({ startDate: event.target.value })} type="date" value={filters.startDate ?? ""} />
            <Input onChange={(event) => updateFilters({ endDate: event.target.value })} type="date" value={filters.endDate ?? ""} />
            <Select onChange={(event) => updateFilters({ city: event.target.value || undefined })} value={filters.city ?? ""}>
              <option value="">All cities</option>
              {["Beirut", "Dubai", "Riyadh"].map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </Select>
            <Input onChange={(event) => updateFilters({ zone: event.target.value || undefined })} placeholder="Zone" value={filters.zone ?? ""} />
            <Select onChange={(event) => updateFilters({ status: (event.target.value as OrderRecord["status"]) || undefined })} value={filters.status ?? ""}>
              <option value="">All statuses</option>
              {["pending", "accepted", "preparing", "ready_for_pickup", "assigned", "picked_up", "on_the_way", "delivered", "canceled", "failed"].map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
            <Select onChange={(event) => updateFilters({ paymentStatus: (event.target.value as OrderRecord["paymentStatus"]) || undefined })} value={filters.paymentStatus ?? ""}>
              <option value="">All payment states</option>
              {["authorized", "paid", "refunded", "partial_refund", "failed"].map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
            <Select onChange={(event) => updateFilters({ storeId: event.target.value || undefined })} value={filters.storeId ?? ""}>
              <option value="">All stores</option>
              {storesQuery.data?.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </Select>
            <Select onChange={(event) => updateFilters({ courierId: event.target.value || undefined })} value={filters.courierId ?? ""}>
              <option value="">All couriers</option>
              {couriersQuery.data?.map((courier) => (
                <option key={courier.id} value={courier.id}>
                  {courier.name}
                </option>
              ))}
            </Select>
            <Select onChange={(event) => updateFilters({ orderType: (event.target.value as OrderRecord["orderType"]) || undefined })} value={filters.orderType ?? ""}>
              <option value="">All order types</option>
              {["delivery", "pickup", "scheduled"].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </FilterBar>
        </PageHeader>

        {ordersQuery.isError ? (
          <ErrorState description="The orders queue could not be loaded." onRetry={() => ordersQuery.refetch()} title="Orders unavailable" />
        ) : ordersQuery.isLoading || !ordersQuery.data ? (
          <TableSkeleton rows={8} />
        ) : (
          <DataTable
            columns={columns}
            data={ordersQuery.data.data}
            getRowId={(row) => row.id}
            onPageChange={(page) => updateFilters({ page })}
            onRowSelectionChange={setRowSelection}
            page={ordersQuery.data.page}
            pageSize={ordersQuery.data.pageSize}
            rowSelection={rowSelection}
            title="Orders queue"
            total={ordersQuery.data.total}
          />
        )}

        <SidePanel
          description={selectedOrderId ? `Operational detail for ${selectedOrderId}` : undefined}
          onClose={() => setSelectedOrderId(null)}
          open={Boolean(selectedOrderId)}
          title={orderDetailQuery.data?.externalId ?? "Order detail"}
        >
          {orderDetailQuery.isLoading || !orderDetailQuery.data ? <TableSkeleton rows={5} /> : <OrderDetailPanel order={orderDetailQuery.data} />}
        </SidePanel>

        <SidePanel
          description="Assign or reassign a courier with a dispatch note."
          onClose={() => setAssignTargetIds(null)}
          open={Boolean(assignTargetIds)}
          title="Assign courier"
        >
          <AssignCourierForm
            couriers={couriersQuery.data ?? []}
            loading={assignMutation.isPending}
            onSubmit={async (values) => {
              if (!assignTargetIds?.length) {
                return;
              }

              await assignMutation.mutateAsync({
                orderIds: assignTargetIds,
                courierId: values.courierId,
                note: values.note
              });
            }}
          />
        </SidePanel>

        <ConfirmDialog
          confirmLabel="Cancel order"
          description={cancelTarget ? `This will cancel ${cancelTarget.externalId} and update customer/store visibility.` : ""}
          destructive
          onClose={() => setCancelTarget(null)}
          onConfirm={() => {
            if (cancelTarget) {
              cancelMutation.mutate(cancelTarget.id);
            }
          }}
          open={Boolean(cancelTarget)}
          title="Cancel order?"
        />
      </div>
    </PermissionGuard>
  );
}
