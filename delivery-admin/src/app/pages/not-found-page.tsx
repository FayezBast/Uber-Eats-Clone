import { Link } from "react-router-dom";

import { EmptyState } from "@/components/feedback/empty-state";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl py-20">
      <EmptyState
        description="The page or entity you were trying to access could not be found."
        title="Page not found"
      />
      <div className="mt-4 text-center text-sm text-muted-foreground">
        <Link to="/">Go to overview</Link>
      </div>
    </div>
  );
}
