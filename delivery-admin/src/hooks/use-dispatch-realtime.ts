import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/services/query-keys";

export function useDispatchRealtime(intervalMs = 12_000) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dispatch.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [intervalMs, queryClient]);
}
