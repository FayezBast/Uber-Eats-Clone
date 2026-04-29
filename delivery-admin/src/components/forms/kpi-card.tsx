import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDurationMinutes, formatNumber } from "@/lib/format";
import type { OverviewMetric } from "@/types";

function formatMetricValue(metric: OverviewMetric) {
  if (metric.format === "currency") {
    return formatCurrency(metric.value);
  }

  if (metric.format === "minutes") {
    return formatDurationMinutes(metric.value);
  }

  return formatNumber(metric.value);
}

export function KpiCard({ metric }: { metric: OverviewMetric }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{metric.label}</div>
        <div className="text-2xl font-semibold tracking-tight">{formatMetricValue(metric)}</div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {metric.trend === "up" ? (
            <ArrowUpRight className="h-4 w-4 text-success" />
          ) : metric.trend === "down" ? (
            <ArrowDownRight className="h-4 w-4 text-warning" />
          ) : (
            <Minus className="h-4 w-4" />
          )}
          <span>{Math.abs(metric.change).toFixed(1)}% vs prior period</span>
        </div>
      </CardContent>
    </Card>
  );
}
