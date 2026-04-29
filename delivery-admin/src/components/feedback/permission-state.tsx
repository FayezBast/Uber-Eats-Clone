import { Lock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export function PermissionState({ title = "Access restricted", description }: { title?: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="rounded-full bg-muted p-3">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
