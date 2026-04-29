import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";

import { DataTable } from "@/components/data-table/data-table";
import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/skeletons";
import { FilterBar } from "@/components/forms/filter-bar";
import { StatusBadge } from "@/components/forms/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { PermissionGuard } from "@/components/layout/permission-guard";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useTicketFilters } from "@/hooks/use-ticket-filters";
import { formatDateTime } from "@/lib/format";
import { queryKeys } from "@/services/query-keys";
import { supportService } from "@/services/support-service";
import type { SupportTicketRecord } from "@/types";

export function SupportPage() {
  const { filters, updateFilters } = useTicketFilters();
  const ticketsQuery = useQuery({
    queryKey: queryKeys.support.list(filters),
    queryFn: () => supportService.listTickets(filters)
  });

  const activeFilterCount = useMemo(
    () => Object.entries(filters).filter(([key, value]) => !["page", "pageSize", "search"].includes(key) && Boolean(value)).length,
    [filters]
  );

  const columns = useMemo<ColumnDef<SupportTicketRecord>[]>(
    () => [
      {
        header: "Ticket",
        cell: ({ row }) => (
          <div>
            <Link className="font-medium text-accent" to={`/support/${row.original.id}`}>
              {row.original.id}
            </Link>
            <p className="text-xs text-muted-foreground">{row.original.subject}</p>
          </div>
        )
      },
      {
        header: "Linked order",
        cell: ({ row }) => row.original.order?.externalId ?? "Unlinked"
      },
      { header: "Priority", cell: ({ row }) => <StatusBadge status={row.original.priority} /> },
      { header: "Type", cell: ({ row }) => row.original.type.replace(/_/g, " ") },
      { header: "Region", accessorKey: "region" },
      { header: "SLA risk", cell: ({ row }) => <StatusBadge status={row.original.slaRisk ? "high" : "low"} label={row.original.slaRisk ? "At risk" : "Stable"} /> },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        header: "Updated",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDateTime(row.original.updatedAt)}</span>
      }
    ],
    []
  );

  return (
    <PermissionGuard permission="support:view">
      <div className="space-y-6">
        <PageHeader
          subtitle="Queue operations for order issues, payment failures, courier incidents, and partner escalations."
          title="Support and incidents"
        >
          <FilterBar activeCount={activeFilterCount}>
            <Input onChange={(event) => updateFilters({ search: event.target.value })} placeholder="Search ticket, subject, order, customer" value={filters.search} />
            <Select onChange={(event) => updateFilters({ priority: (event.target.value as SupportTicketRecord["priority"]) || undefined })} value={filters.priority ?? ""}>
              <option value="">All priorities</option>
              {["urgent", "high", "medium", "low"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
            <Select onChange={(event) => updateFilters({ type: (event.target.value as SupportTicketRecord["type"]) || undefined })} value={filters.type ?? ""}>
              <option value="">All issue types</option>
              {["missing_item", "late_order", "wrong_address", "courier_no_show", "store_closed", "payment_issue"].map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
            <Input onChange={(event) => updateFilters({ region: event.target.value || undefined })} placeholder="Region" value={filters.region ?? ""} />
            <Select onChange={(event) => updateFilters({ slaRisk: (event.target.value as "true" | "false") || undefined })} value={filters.slaRisk ?? ""}>
              <option value="">All SLA states</option>
              <option value="true">At risk</option>
              <option value="false">Stable</option>
            </Select>
            <Select onChange={(event) => updateFilters({ status: (event.target.value as SupportTicketRecord["status"]) || undefined })} value={filters.status ?? ""}>
              <option value="">All statuses</option>
              {["open", "investigating", "pending_partner", "resolved", "closed"].map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </FilterBar>
        </PageHeader>

        {ticketsQuery.isError ? (
          <ErrorState description="Support queue data could not be loaded." onRetry={() => ticketsQuery.refetch()} title="Support queue unavailable" />
        ) : ticketsQuery.isLoading || !ticketsQuery.data ? (
          <TableSkeleton rows={8} />
        ) : (
          <DataTable
            columns={columns}
            data={ticketsQuery.data.data}
            onPageChange={(page) => updateFilters({ page })}
            page={ticketsQuery.data.page}
            pageSize={ticketsQuery.data.pageSize}
            title="Ticket queue"
            total={ticketsQuery.data.total}
          />
        )}
      </div>
    </PermissionGuard>
  );
}
