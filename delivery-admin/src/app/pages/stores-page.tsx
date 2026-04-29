import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/skeletons";
import { FilterBar } from "@/components/forms/filter-bar";
import { StatusBadge } from "@/components/forms/status-badge";
import { PageHeader, PageHeaderAction } from "@/components/layout/page-header";
import { PermissionGuard } from "@/components/layout/permission-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatPercent } from "@/lib/format";
import { queryKeys } from "@/services/query-keys";
import { storesService } from "@/services/stores-service";
import type { Store } from "@/types";

export function StoresPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const storesQuery = useQuery({
    queryKey: queryKeys.stores.list,
    queryFn: storesService.listStores
  });
  const updateStatusMutation = useMutation({
    mutationFn: ({ storeId, nextStatus }: { storeId: string; nextStatus: Store["status"] }) => storesService.updateStoreStatus(storeId, nextStatus),
    onSuccess: async () => {
      toast.success("Store status updated");
      await queryClient.invalidateQueries({ queryKey: queryKeys.stores.all });
    }
  });

  const filteredStores = useMemo(
    () =>
      (storesQuery.data ?? []).filter((store) => {
        const matchesSearch = [store.name, store.brand, store.city, store.zone].join(" ").toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !status || store.status === status;
        return matchesSearch && matchesStatus;
      }),
    [search, status, storesQuery.data]
  );

  const columns = useMemo<ColumnDef<Store>[]>(
    () => [
      {
        header: "Store",
        cell: ({ row }) => (
          <div>
            <Link className="font-medium text-accent" to={`/stores/${row.original.id}`}>
              {row.original.name}
            </Link>
            <p className="text-xs text-muted-foreground">{row.original.brand}</p>
          </div>
        )
      },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        header: "City / Zone",
        cell: ({ row }) => (
          <div>
            <p>{row.original.city}</p>
            <p className="text-xs text-muted-foreground">{row.original.zone}</p>
          </div>
        )
      },
      { header: "Rating", accessorKey: "rating" },
      {
        header: "Prep time",
        cell: ({ row }) => <span>{row.original.averagePrepTimeMinutes} min</span>
      },
      {
        header: "Cancellation",
        cell: ({ row }) => <span>{formatPercent(row.original.cancellationRate)}</span>
      },
      { header: "Commission", accessorKey: "commissionPlan" },
      { header: "Opening hours", accessorKey: "openingHours" },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => updateStatusMutation.mutate({ storeId: row.original.id, nextStatus: "busy" })} size="sm" variant="outline">
              Mark busy
            </Button>
            <Button onClick={() => updateStatusMutation.mutate({ storeId: row.original.id, nextStatus: "offline" })} size="sm" variant="outline">
              Offline
            </Button>
          </div>
        )
      }
    ],
    [updateStatusMutation]
  );

  return (
    <PermissionGuard permission="stores:view">
      <div className="space-y-6">
        <PageHeader
          primaryAction={
            <PageHeaderAction onClick={() => toast.success("Store export queued")} variant="outline">
              Export
            </PageHeaderAction>
          }
          subtitle="Merchant operations, menu sync health, prep-time governance, service areas, and payout context."
          title="Store management"
        >
          <FilterBar>
            <Input onChange={(event) => setSearch(event.target.value)} placeholder="Search store, brand, city, zone" value={search} />
            <Select onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="">All statuses</option>
              {["online", "busy", "offline", "disabled"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </FilterBar>
        </PageHeader>

        {storesQuery.isError ? (
          <ErrorState description="Store data could not be loaded." onRetry={() => storesQuery.refetch()} title="Stores unavailable" />
        ) : storesQuery.isLoading ? (
          <TableSkeleton rows={8} />
        ) : (
          <DataTable columns={columns} data={filteredStores} title="Merchant directory" />
        )}
      </div>
    </PermissionGuard>
  );
}
