import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorStateProps {
  title?: string;
  description: string;
  action?: ReactNode;
}

export function ErrorState({
  title = "Something went off course",
  description,
  action
}: ErrorStateProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/80">
      <CardHeader className="items-center text-center">
        <div className="rounded-full bg-amber-100 p-4">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
