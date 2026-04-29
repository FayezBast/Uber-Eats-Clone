import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/skeletons";
import { FilterBar } from "@/components/forms/filter-bar";
import { StatusBadge } from "@/components/forms/status-badge";
import { KpiCard } from "@/components/forms/kpi-card";
import { PageHeader, PageHeaderAction } from "@/components/layout/page-header";
import { PermissionGuard } from "@/components/layout/permission-guard";
import { Input } from "@/components/ui/input";
import { financeService } from "@/services/finance-service";
import { queryKeys } from "@/services/query-keys";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { OverviewMetric, Payout, Refund } from "@/types";

export function FinancePage() {
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [refundPage, setRefundPage] = useState(1);
  const [payoutPage, setPayoutPage] = useState(1);
  const overviewQuery = useQuery({
    queryKey: queryKeys.finance.overview,
    queryFn: financeService.getOverview
  });
  const refundsQuery = useQuery({
    queryKey: queryKeys.finance.refunds({ page: refundPage, pageSize: 5, ...dateRange }),
    queryFn: () => financeService.listRefunds({ page: refundPage, pageSize: 5, ...dateRange })
  });
  const payoutsQuery = useQuery({
    queryKey: queryKeys.finance.payouts({ page: payoutPage, pageSize: 5, ...dateRange }),
    queryFn: () => financeService.listPayouts({ page: payoutPage, pageSize: 5, ...dateRange })
  });

  const metrics = useMemo<OverviewMetric[]>(
    () =>
      overviewQuery.data
        ? [
            { label: "GMV", value: overviewQuery.data.gmv, change: 9.4, trend: "up", format: "currency" },
            { label: "Net Revenue", value: overviewQuery.data.netRevenue, change: 7.2, trend: "up", format: "currency" },
            { label: "Platform Fees", value: overviewQuery.data.platformFees, change: 5.1, trend: "up", format: "currency" },
            { label: "Refunds", value: overviewQuery.data.refunds, change: 4.3, trend: "up", format: "currency" },
            { label: "Promo Costs", value: overviewQuery.data.promoCosts, change: 3.1, trend: "up", format: "currency" },
            { label: "Commissions", value: overviewQuery.data.commissions, change: 6.7, trend: "up", format: "currency" }
          ]
        : [],
    [overviewQuery.data]
  );

  const refundColumns = useMemo<ColumnDef<Refund>[]>(
    () => [
      { header: "Refund ID", accessorKey: "id" },
      { header: "Order", accessorKey: "orderId" },
      { header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount) },
      { header: "Reason", accessorKey: "reason" },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { header: "Created", cell: ({ row }) => formatDateTime(row.original.createdAt) }
    ],
    []
  );

  const payoutColumns = useMemo<ColumnDef<Payout>[]>(
    () => [
      { header: "Payout ID", accessorKey: "id" },
      { header: "Target", cell: ({ row }) => `${row.original.targetName} · ${row.original.targetType}` },
      { header: "Amount", cell: ({ row }) => formatCurrency(row.original.amount) },
      { header: "Period", cell: ({ row }) => `${formatDateTime(row.original.periodStart)} → ${formatDateTime(row.original.periodEnd)}` },
      { header: "Settlement", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { header: "Scheduled", cell: ({ row }) => formatDateTime(row.original.scheduledAt) }
    ],
    []
  );

  if (overviewQuery.isError || refundsQuery.isError || payoutsQuery.isError) {
    return <ErrorState description="Finance data could not be loaded." title="Finance unavailable" />;
  }

  return (
    <PermissionGuard permission="finance:view">
      <div className="space-y-6">
        <PageHeader
          primaryAction={
            <PageHeaderAction onClick={() => toast.success("Finance export queued")} variant="outline">
              Export
            </PageHeaderAction>
          }
          subtitle="GMV, revenue, refunds, partner settlements, and billing state visibility."
          title="Finance and payments"
        >
          <FilterBar>
            <Input onChange={(event) => setDateRange((current) => ({ ...current, startDate: event.target.value }))} type="date" value={dateRange.startDate} />
            <Input onChange={(event) => setDateRange((current) => ({ ...current, endDate: event.target.value }))} type="date" value={dateRange.endDate} />
          </FilterBar>
        </PageHeader>

        {overviewQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <TableSkeleton key={index} rows={2} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <KpiCard key={metric.label} metric={metric} />
            ))}
          </div>
        )}

        {refundsQuery.isLoading || payoutsQuery.isLoading || !refundsQuery.data || !payoutsQuery.data ? (
          <TableSkeleton rows={8} />
        ) : (
          <div className="space-y-4">
            <DataTable
              columns={refundColumns}
              data={refundsQuery.data.data}
              onPageChange={setRefundPage}
              page={refundsQuery.data.page}
              pageSize={refundsQuery.data.pageSize}
              title="Refunds"
              total={refundsQuery.data.total}
            />
            <DataTable
              columns={payoutColumns}
              data={payoutsQuery.data.data}
              onPageChange={setPayoutPage}
              page={payoutsQuery.data.page}
              pageSize={payoutsQuery.data.pageSize}
              title="Payouts"
              total={payoutsQuery.data.total}
            />
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
