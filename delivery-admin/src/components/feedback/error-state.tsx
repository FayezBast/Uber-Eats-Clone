import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ErrorState({ title, description, onRetry }: { title: string; description: string; onRetry?: () => void }) {
  return (
    <Card className="border-destructive/20">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        {onRetry ? (
          <Button onClick={onRetry} variant="outline">
            Retry
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
