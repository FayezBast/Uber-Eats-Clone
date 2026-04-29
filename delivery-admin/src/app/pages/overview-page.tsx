import { useQuery } from "@tanstack/react-query";
import { Activity, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { ChartCard } from "@/components/charts/chart-card";
import { ErrorState } from "@/components/feedback/error-state";
import { KpiCardSkeleton } from "@/components/feedback/skeletons";
import { KpiCard } from "@/components/forms/kpi-card";
import { StatusBadge } from "@/components/forms/status-badge";
import { PageHeader, PageHeaderAction } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { overviewService } from "@/services/overview-service";
import { queryKeys } from "@/services/query-keys";

export function OverviewPage() {
  const overviewQuery = useQuery({
    queryKey: queryKeys.overview,
    queryFn: overviewService.getOverview
  });

  if (overviewQuery.isError) {
    return <ErrorState description="The overview feed could not be loaded." onRetry={() => overviewQuery.refetch()} title="Overview unavailable" />;
  }

  const overview = overviewQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        primaryAction={
          <PageHeaderAction onClick={() => overviewQuery.refetch()} variant="outline">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </PageHeaderAction>
        }
        subtitle="Platform health, live operational load, commercial performance, and queue exceptions."
        title="Operations overview"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {overviewQuery.isLoading || !overview
          ? Array.from({ length: 10 }).map((_, index) => <KpiCardSkeleton key={index} />)
          : Object.values(overview.metrics).map((metric) => <KpiCard key={metric.label} metric={metric} />)}
      </div>

      {overview ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.4fr,1fr]">
            <ChartCard description="Total order volume by recent hourly buckets." title="Orders over time">
              <div className="h-72">
                <ResponsiveContainer height="100%" width="100%">
                  <LineChart data={overview.ordersOverTime}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line dataKey="value" dot={false} stroke="hsl(var(--primary))" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard description="Revenue captured from delivered orders." title="Sales over time">
              <div className="h-72">
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={overview.salesOverTime}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" fill="hsl(var(--foreground))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr,1fr,1.1fr]">
            <ChartCard description="Operational reasons behind same-day cancellations." title="Cancellations by reason">
              <div className="h-72">
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={overview.cancellationsByReason}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--warning))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard description="Capacity utilization by available courier pool." title="Courier utilization">
              <div className="h-72">
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={overview.courierUtilization} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis tickLine={false} axisLine={false} type="number" />
                    <YAxis dataKey="label" tickLine={false} axisLine={false} type="category" width={88} />
                    <Tooltip formatter={(value: number) => `${value}%`} />
                    <Bar dataKey="value" fill="hsl(var(--success))" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <Card>
              <CardHeader>
                <div className="space-y-1">
                  <CardTitle>Live activity feed</CardTitle>
                  <p className="text-sm text-muted-foreground">Orders, store alerts, support incidents, and dispatch anomalies.</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.activityFeed.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">{item.title}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.detail}</p>
                      </div>
                      <StatusBadge status={item.severity} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(item.timestamp)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
