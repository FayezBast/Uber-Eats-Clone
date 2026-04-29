import { Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="rounded-full bg-muted p-3">
          <Inbox className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {actionLabel && onAction ? (
          <Button onClick={onAction} variant="outline">
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
