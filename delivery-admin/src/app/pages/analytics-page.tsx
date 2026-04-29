import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartCard } from "@/components/charts/chart-card";
import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/skeletons";
import { PageHeader, PageHeaderAction } from "@/components/layout/page-header";
import { PermissionGuard } from "@/components/layout/permission-guard";
import { Tabs } from "@/components/ui/tabs";
import { analyticsService } from "@/services/analytics-service";
import { queryKeys } from "@/services/query-keys";

const analyticsTabs = [
  { label: "Orders", value: "orders" },
  { label: "Delivery", value: "deliveryPerformance" },
  { label: "Stores", value: "storePerformance" },
  { label: "Couriers", value: "courierPerformance" },
  { label: "Retention", value: "customerRetention" },
  { label: "Cancellations / Refunds", value: "cancellationsRefunds" }
] as const;

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<(typeof analyticsTabs)[number]["value"]>("orders");
  const analyticsQuery = useQuery({
    queryKey: queryKeys.analytics,
    queryFn: analyticsService.getAnalytics
  });

  if (analyticsQuery.isError) {
    return <ErrorState description="Analytics could not be loaded." onRetry={() => analyticsQuery.refetch()} title="Analytics unavailable" />;
  }

  return (
    <PermissionGuard permission="analytics:view">
      <div className="space-y-6">
        <PageHeader
          primaryAction={<PageHeaderAction variant="outline">Export report</PageHeaderAction>}
          subtitle="Operational and commercial performance views for orders, delivery, stores, couriers, retention, and cancellation drivers."
          title="Analytics"
        >
          <Tabs onChange={setActiveTab} options={analyticsTabs} value={activeTab} />
        </PageHeader>

        {analyticsQuery.isLoading || !analyticsQuery.data ? (
          <TableSkeleton rows={8} />
        ) : (
          <ChartCard description="Practical operational comparisons across the selected analytics slice." title={analyticsTabs.find((tab) => tab.value === activeTab)?.label ?? "Analytics"}>
            <div className="h-[28rem]">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={analyticsQuery.data[activeTab]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}
      </div>
    </PermissionGuard>
  );
}
