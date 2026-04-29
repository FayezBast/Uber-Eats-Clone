import type { PropsWithChildren, ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export function FilterBar({
  activeCount,
  actions,
  children
}: PropsWithChildren<{ activeCount?: number; actions?: ReactNode }>) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-3 md:grid-cols-2 xl:flex xl:flex-wrap">{children}</div>
          <div className="flex items-center gap-3">
            {activeCount ? <span className="text-xs font-medium text-muted-foreground">{activeCount} active filters</span> : null}
            {actions}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
