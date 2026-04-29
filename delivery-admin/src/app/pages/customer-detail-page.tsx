import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/skeletons";
import { StatusBadge } from "@/components/forms/status-badge";
import { PageHeader, PageHeaderAction } from "@/components/layout/page-header";
import { SectionCard } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { customersService } from "@/services/customers-service";
import { queryKeys } from "@/services/query-keys";

export function CustomerDetailPage() {
  const { customerId = "" } = useParams();
  const queryClient = useQueryClient();
  const customerQuery = useQuery({
    queryKey: queryKeys.customers.detail(customerId),
    queryFn: () => customersService.getCustomerDetail(customerId)
  });
  const statusMutation = useMutation({
    mutationFn: ({ customerId, accountStatus }: { customerId: string; accountStatus: "active" | "restricted" | "blocked" }) =>
      customersService.updateCustomerStatus(customerId, accountStatus),
    onSuccess: async () => {
      toast.success("Customer status updated");
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    }
  });
  const noteMutation = useMutation({
    mutationFn: ({ customerId, body }: { customerId: string; body: string }) => customersService.addCustomerNote(customerId, body),
    onSuccess: async () => {
      toast.success("Support note added");
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
    }
  });

  if (customerQuery.isError) {
    return <ErrorState description="This customer profile could not be loaded." onRetry={() => customerQuery.refetch()} title="Customer unavailable" />;
  }

  if (customerQuery.isLoading || !customerQuery.data) {
    return <TableSkeleton rows={8} />;
  }

  const customer = customerQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        primaryAction={
          <PageHeaderAction
            onClick={() =>
              statusMutation.mutate({
                customerId: customer.id,
                accountStatus: customer.accountStatus === "active" ? "restricted" : "active"
              })
            }
            variant="outline"
          >
            {customer.accountStatus === "active" ? "Restrict account" : "Reactivate account"}
          </PageHeaderAction>
        }
        secondaryAction={
          <PageHeaderAction onClick={() => noteMutation.mutate({ customerId: customer.id, body: "Account reviewed by support. Keep monitoring refund velocity." })} variant="outline">
            Add support note
          </PageHeaderAction>
        }
        subtitle={customer.email}
        title={customer.name}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr,1fr,1fr]">
        <SectionCard description="Spend, account status, refunds, and risk posture." title="Account summary">
          <div className="space-y-3 text-sm">
            <DetailRow label="Status" value={<StatusBadge status={customer.accountStatus} />} />
            <DetailRow label="Risk" value={<StatusBadge status={customer.riskLevel} />} />
            <DetailRow label="Total orders" value={`${customer.totalOrders}`} />
            <DetailRow label="Total spend" value={formatCurrency(customer.totalSpend)} />
            <DetailRow label="Refunds" value={`${customer.refundsCount} · ${formatCurrency(customer.refundsValue)}`} />
            <DetailRow label="Cancellation rate" value={`${customer.cancellationRate}%`} />
          </div>
        </SectionCard>

        <SectionCard description="Saved delivery destinations and customer guidance." title="Saved addresses">
          <div className="space-y-3">
            {customer.savedAddresses.map((address, index) => (
              <div key={`${address.line1}-${index}`} className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium">{address.line1}</p>
                <p className="text-sm text-muted-foreground">
                  {address.area}, {address.zone}, {address.city}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard description="Support-only notes and account handling instructions." title="Support notes">
          <div className="space-y-3">
            {customer.supportNotes.length ? (
              customer.supportNotes.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{entry.author}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{entry.body}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No support notes added.</p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr,1fr,1fr]">
        <SectionCard description="Recent orders placed by this customer." title="Order history">
          <div className="space-y-3">
            {customer.orderHistory.slice(0, 6).map((order) => (
              <div key={order.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{order.externalId}</p>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{order.store.name}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard description="Customer-linked support tickets and dispute history." title="Support tickets">
          <div className="space-y-3">
            {customer.tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{ticket.subject}</p>
                  <StatusBadge status={ticket.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{ticket.type.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard description="Refund and compensation activity on the account." title="Refund history">
          <div className="space-y-3">
            {customer.refundHistory.map((refund) => (
              <div key={refund.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{formatCurrency(refund.amount)}</p>
                  <StatusBadge status={refund.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{refund.reason}</p>
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
