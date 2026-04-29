import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/skeletons";
import { SidePanel } from "@/components/forms/side-panel";
import { StatusBadge } from "@/components/forms/status-badge";
import { KpiCard } from "@/components/forms/kpi-card";
import { PageHeader, PageHeaderAction } from "@/components/layout/page-header";
import { PermissionGuard } from "@/components/layout/permission-guard";
import { PromotionForm } from "@/domains/promotions/promotion-form";
import { promotionsService } from "@/services/promotions-service";
import { queryKeys } from "@/services/query-keys";
import { storesService } from "@/services/stores-service";
import { formatCurrency } from "@/lib/format";
import type { OverviewMetric, PromoCampaign } from "@/types";

export function PromotionsPage() {
  const queryClient = useQueryClient();
  const [editingCampaign, setEditingCampaign] = useState<PromoCampaign | undefined>();
  const [panelOpen, setPanelOpen] = useState(false);
  const promotionsQuery = useQuery({
    queryKey: queryKeys.promotions.list,
    queryFn: promotionsService.listPromotions
  });
  const storesQuery = useQuery({
    queryKey: queryKeys.stores.list,
    queryFn: storesService.listStores
  });
  const saveMutation = useMutation({
    mutationFn: ({ promotionId, values }: { promotionId?: string; values: Parameters<typeof promotionsService.savePromotion>[0] }) =>
      promotionsService.savePromotion(values, promotionId),
    onSuccess: async () => {
      toast.success("Promotion saved");
      setPanelOpen(false);
      setEditingCampaign(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.promotions.all });
    }
  });

  const metrics = useMemo<OverviewMetric[]>(
    () =>
      promotionsQuery.data
        ? [
            {
              label: "Active campaigns",
              value: promotionsQuery.data.filter((promotion) => promotion.status === "active").length,
              change: 2.1,
              trend: "up",
              format: "number"
            },
            {
              label: "Total redemptions",
              value: promotionsQuery.data.reduce((total, promotion) => total + promotion.totalRedemptions, 0),
              change: 11.3,
              trend: "up",
              format: "number"
            },
            {
              label: "Discount value",
              value: promotionsQuery.data.reduce((total, promotion) => total + promotion.totalDiscountValue, 0),
              change: 8.8,
              trend: "up",
              format: "currency"
            }
          ]
        : [],
    [promotionsQuery.data]
  );

  const columns = useMemo<ColumnDef<PromoCampaign>[]>(
    () => [
      {
        header: "Campaign",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.code}</p>
          </div>
        )
      },
      { header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        header: "Type",
        cell: ({ row }) =>
          row.original.promoType === "percentage" ? `${row.original.percentageOff}% off` : `${formatCurrency(row.original.flatAmountOff ?? 0)} off`
      },
      { header: "City", cell: ({ row }) => row.original.city ?? "All" },
      { header: "Budget cap", cell: ({ row }) => formatCurrency(row.original.budgetCap) },
      { header: "Redemptions", accessorKey: "totalRedemptions" },
      { header: "Discount value", cell: ({ row }) => formatCurrency(row.original.totalDiscountValue) },
      {
        header: "Actions",
        cell: ({ row }) => (
          <PageHeaderAction
            onClick={() => {
              setEditingCampaign(row.original);
              setPanelOpen(true);
            }}
            size="sm"
            variant="outline"
          >
            Edit
          </PageHeaderAction>
        )
      }
    ],
    []
  );

  if (promotionsQuery.isError || storesQuery.isError) {
    return <ErrorState description="Promotion data could not be loaded." title="Promotions unavailable" />;
  }

  return (
    <PermissionGuard permission="promotions:view">
      <div className="space-y-6">
        <PageHeader
          primaryAction={
            <PageHeaderAction
              onClick={() => {
                setEditingCampaign(undefined);
                setPanelOpen(true);
              }}
            >
              Create campaign
            </PageHeaderAction>
          }
          subtitle="Campaign configuration, budget control, redemption analytics, and abuse-prevention policy."
          title="Promotions and campaigns"
        />

        {promotionsQuery.isLoading ? (
          <TableSkeleton rows={8} />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {metrics.map((metric) => (
                <KpiCard key={metric.label} metric={metric} />
              ))}
            </div>
            <DataTable columns={columns} data={promotionsQuery.data ?? []} title="Campaigns" />
          </>
        )}

        <SidePanel
          description="Configure discount rules, audience, time windows, budgets, and abuse controls."
          onClose={() => setPanelOpen(false)}
          open={panelOpen}
          title={editingCampaign ? `Edit ${editingCampaign.name}` : "Create promotion"}
        >
          <PromotionForm
            campaign={editingCampaign}
            loading={saveMutation.isPending}
            onSubmit={async (values) => {
              await saveMutation.mutateAsync({
                promotionId: editingCampaign?.id,
                values
              });
            }}
            stores={storesQuery.data ?? []}
          />
        </SidePanel>
      </div>
    </PermissionGuard>
  );
}
