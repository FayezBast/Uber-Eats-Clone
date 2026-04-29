import { isRouteErrorResponse, useRouteError } from "react-router-dom";

import { ErrorState } from "@/components/feedback/error-state";

export function RouteErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return <ErrorState description={error.statusText} title={`Route error ${error.status}`} />;
  }

  return <ErrorState description="An unexpected routing error occurred." title="Unexpected error" />;
}
