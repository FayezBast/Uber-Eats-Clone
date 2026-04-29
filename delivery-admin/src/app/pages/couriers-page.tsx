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
import { PageHeader } from "@/components/layout/page-header";
import { PermissionGuard } from "@/components/layout/permission-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { couriersService } from "@/services/couriers-service";
import { queryKeys } from "@/services/query-keys";
import type { Courier } from "@/types";

export function CouriersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const couriersQuery = useQuery({
    queryKey: queryKeys.couriers.list,
    queryFn: couriersService.listCouriers
  });
  const statusMutation = useMutation({
    mutationFn: ({ courierId, nextStatus }: { courierId: string; nextStatus: Courier["status"] }) =>
      couriersService.updateCourierStatus(courierId, nextStatus),
    onSuccess: async () => {
      toast.success("Courier status updated");
      await queryClient.invalidateQueries({ queryKey: queryKeys.couriers.all });
    }
  });

  const filteredCouriers = useMemo(
    () =>
      (couriersQuery.data ?? []).filter((courier) => {
        const matchesSearch = [courier.name, courier.zone, courier.city, courier.vehicleType].join(" ").toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !status || courier.status === status;
        return matchesSearch && matchesStatus;
      }),
    [couriersQuery.data, search, status]
  );

  const columns = useMemo<ColumnDef<Courier>[]>(
    () => [
      {
        header: "Courier",
        cell: ({ row }) => (
          <div>
            <Link className="font-medium text-accent" to={`/couriers/${row.original.id}`}>
              {row.original.name}
            </Link>
            <p className="text-xs text-muted-foreground">{row.original.vehicleType}</p>
          </div>
        )
      },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { header: "Zone", cell: ({ row }) => `${row.original.city} / ${row.original.zone}` },
      { header: "Capacity", cell: ({ row }) => `${row.original.currentCapacity} / ${row.original.activeTasks} active` },
      { header: "Acceptance", cell: ({ row }) => `${row.original.acceptanceRate}%` },
      { header: "Completion", cell: ({ row }) => `${row.original.completionRate}%` },
      { header: "Late rate", cell: ({ row }) => `${row.original.lateRate}%` },
      { header: "Earnings", cell: ({ row }) => `$${row.original.earningsToday}` },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => statusMutation.mutate({ courierId: row.original.id, nextStatus: "online" })} size="sm" variant="outline">
              Activate
            </Button>
            <Button onClick={() => statusMutation.mutate({ courierId: row.original.id, nextStatus: "suspended" })} size="sm" variant="outline">
              Suspend
            </Button>
          </div>
        )
      }
    ],
    [statusMutation]
  );

  return (
    <PermissionGuard permission="couriers:view">
      <div className="space-y-6">
        <PageHeader
          subtitle="Courier performance, documents, zone management, incident response, and payout visibility."
          title="Courier management"
        >
          <FilterBar>
            <Input onChange={(event) => setSearch(event.target.value)} placeholder="Search courier, city, zone, vehicle" value={search} />
            <Select onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="">All statuses</option>
              {["online", "offline", "paused", "busy", "suspended"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </FilterBar>
        </PageHeader>

        {couriersQuery.isError ? (
          <ErrorState description="Courier data could not be loaded." onRetry={() => couriersQuery.refetch()} title="Couriers unavailable" />
        ) : couriersQuery.isLoading ? (
          <TableSkeleton rows={8} />
        ) : (
          <DataTable columns={columns} data={filteredCouriers} title="Courier directory" />
        )}
      </div>
    </PermissionGuard>
  );
}
