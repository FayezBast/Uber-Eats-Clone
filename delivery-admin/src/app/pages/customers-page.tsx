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
import { formatCurrency } from "@/lib/format";
import { customersService } from "@/services/customers-service";
import { queryKeys } from "@/services/query-keys";
import type { Customer } from "@/types";

export function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const customersQuery = useQuery({
    queryKey: queryKeys.customers.list,
    queryFn: customersService.listCustomers
  });
  const statusMutation = useMutation({
    mutationFn: ({ customerId, accountStatus }: { customerId: string; accountStatus: Customer["accountStatus"] }) =>
      customersService.updateCustomerStatus(customerId, accountStatus),
    onSuccess: async () => {
      toast.success("Customer status updated");
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    }
  });

  const filteredCustomers = useMemo(
    () =>
      (customersQuery.data ?? []).filter((customer) => {
        const matchesSearch = [customer.name, customer.phone, customer.email].join(" ").toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !status || customer.accountStatus === status;
        return matchesSearch && matchesStatus;
      }),
    [customersQuery.data, search, status]
  );

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        header: "Customer",
        cell: ({ row }) => (
          <div>
            <Link className="font-medium text-accent" to={`/customers/${row.original.id}`}>
              {row.original.name}
            </Link>
            <p className="text-xs text-muted-foreground">{row.original.phone}</p>
          </div>
        )
      },
      {
        header: "Contact",
        cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.email}</span>
      },
      { header: "Total orders", accessorKey: "totalOrders" },
      {
        header: "Total spend",
        cell: ({ row }) => <span>{formatCurrency(row.original.totalSpend)}</span>
      },
      {
        header: "Refunds",
        cell: ({ row }) => (
          <span>
            {row.original.refundsCount} · {formatCurrency(row.original.refundsValue)}
          </span>
        )
      },
      {
        header: "Cancellation",
        cell: ({ row }) => <span>{row.original.cancellationRate.toFixed(1)}%</span>
      },
      {
        header: "Risk",
        cell: ({ row }) => <StatusBadge status={row.original.riskLevel} />
      },
      {
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.accountStatus} />
      },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                statusMutation.mutate({
                  customerId: row.original.id,
                  accountStatus: row.original.accountStatus === "active" ? "restricted" : "active"
                })
              }
              size="sm"
              variant="outline"
            >
              {row.original.accountStatus === "active" ? "Restrict" : "Reactivate"}
            </Button>
          </div>
        )
      }
    ],
    [statusMutation]
  );

  return (
    <PermissionGuard permission="customers:view">
      <div className="space-y-6">
        <PageHeader
          subtitle="Order history, support signals, refund patterns, and account-level abuse review."
          title="Customers"
        >
          <FilterBar>
            <Input onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, email, phone" value={search} />
            <Select onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="">All statuses</option>
              {["active", "restricted", "blocked"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </FilterBar>
        </PageHeader>

        {customersQuery.isError ? (
          <ErrorState description="Customer records could not be loaded." onRetry={() => customersQuery.refetch()} title="Customers unavailable" />
        ) : customersQuery.isLoading ? (
          <TableSkeleton rows={8} />
        ) : (
          <DataTable columns={columns} data={filteredCustomers} title="Customer directory" />
        )}
      </div>
    </PermissionGuard>
  );
}
