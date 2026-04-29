import type { ReactNode } from "react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/skeletons";
import { StatusBadge } from "@/components/forms/status-badge";
import { PageHeader, PageHeaderAction } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { ordersService } from "@/services/orders-service";
import { queryKeys } from "@/services/query-keys";
import { supportService } from "@/services/support-service";

export function SupportDetailPage() {
  const { ticketId = "" } = useParams();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const ticketQuery = useQuery({
    queryKey: queryKeys.support.detail(ticketId),
    queryFn: () => supportService.getTicketDetail(ticketId)
  });
  const statusMutation = useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: "open" | "investigating" | "pending_partner" | "resolved" | "closed" }) =>
      supportService.updateTicketStatus(ticketId, status),
    onSuccess: async () => {
      toast.success("Ticket status updated");
      await queryClient.invalidateQueries({ queryKey: queryKeys.support.all });
    }
  });
  const noteMutation = useMutation({
    mutationFn: ({ ticketId, body }: { ticketId: string; body: string }) => supportService.addTicketNote(ticketId, body),
    onSuccess: async () => {
      toast.success("Ticket note added");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.support.detail(ticketId) });
    }
  });
  const compensationMutation = useMutation({
    mutationFn: ({ orderId, amount }: { orderId: string; amount: number }) =>
      ordersService.refundOrder(orderId, amount, `Support compensation from ${ticketId}`),
    onSuccess: async () => {
      toast.success("Compensation issued");
      await queryClient.invalidateQueries({ queryKey: queryKeys.finance.overview });
    }
  });

  if (ticketQuery.isError) {
    return <ErrorState description="This ticket could not be loaded." onRetry={() => ticketQuery.refetch()} title="Ticket unavailable" />;
  }

  if (ticketQuery.isLoading || !ticketQuery.data) {
    return <TableSkeleton rows={8} />;
  }

  const ticket = ticketQuery.data;
  const linkedOrder = ticket.order;

  return (
    <div className="space-y-6">
      <PageHeader
        primaryAction={
          <PageHeaderAction onClick={() => statusMutation.mutate({ ticketId: ticket.id, status: ticket.status === "resolved" ? "closed" : "resolved" })} variant="outline">
            {ticket.status === "resolved" ? "Close ticket" : "Resolve ticket"}
          </PageHeaderAction>
        }
        secondaryAction={
          linkedOrder ? (
            <PageHeaderAction onClick={() => compensationMutation.mutate({ orderId: linkedOrder.id, amount: ticket.compensationSuggested })} variant="outline">
              Issue {formatCurrency(ticket.compensationSuggested)}
            </PageHeaderAction>
          ) : null
        }
        subtitle={`${ticket.type.replace(/_/g, " ")} · ${ticket.region}`}
        title={ticket.subject}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr,1fr,1fr]">
        <SectionCard description="Ticket state, issue metadata, and linked operational context." title="Ticket detail">
          <div className="space-y-3 text-sm">
            <DetailRow label="Priority" value={<StatusBadge status={ticket.priority} />} />
            <DetailRow label="Status" value={<StatusBadge status={ticket.status} />} />
            <DetailRow label="Region" value={ticket.region} />
            <DetailRow label="SLA risk" value={ticket.slaRisk ? "At risk" : "Stable"} />
            <DetailRow label="Created" value={formatDateTime(ticket.createdAt)} />
            <DetailRow label="Updated" value={formatDateTime(ticket.updatedAt)} />
          </div>
        </SectionCard>

        <SectionCard description="Linked entities affected by this incident." title="Participants">
          <div className="space-y-3 text-sm">
            <DetailRow label="Customer" value={ticket.customer?.name ?? "N/A"} />
            <DetailRow label="Store" value={ticket.store?.name ?? "N/A"} />
            <DetailRow label="Courier" value={ticket.courier?.name ?? "N/A"} />
            <DetailRow label="Order" value={linkedOrder?.externalId ?? "N/A"} />
          </div>
        </SectionCard>

        <SectionCard description="Compensation and refund tooling." title="Compensation tools">
          <div className="space-y-3 text-sm">
            <DetailRow label="Suggested credit" value={formatCurrency(ticket.compensationSuggested)} />
            <DetailRow label="Linked order total" value={linkedOrder ? formatCurrency(linkedOrder.amount) : "N/A"} />
            <Button
              className="w-full"
              disabled={!linkedOrder}
              onClick={() => linkedOrder && compensationMutation.mutate({ orderId: linkedOrder.id, amount: ticket.compensationSuggested })}
              variant="outline"
            >
              Issue compensation
            </Button>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr,0.9fr]">
        <SectionCard description="Participant notes, status changes, and investigation context." title="Chat and notes timeline">
          <div className="space-y-3">
            {ticket.notes.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{entry.author}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{entry.body}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard description="Add an operator note or next action update." title="Add note">
          <div className="space-y-3">
            <Textarea onChange={(event) => setNote(event.target.value)} placeholder="Document what happened, who was contacted, and the next operational step." value={note} />
            <Button disabled={!note.trim()} onClick={() => noteMutation.mutate({ ticketId: ticket.id, body: note })}>
              Add note
            </Button>
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
