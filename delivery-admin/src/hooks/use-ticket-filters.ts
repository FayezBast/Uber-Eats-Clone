import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import type { TicketFilters } from "@/types";

export function useTicketFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<TicketFilters>(
    () => ({
      search: searchParams.get("search") ?? "",
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 8),
      priority: (searchParams.get("priority") as TicketFilters["priority"]) ?? undefined,
      type: (searchParams.get("type") as TicketFilters["type"]) ?? undefined,
      region: searchParams.get("region") ?? undefined,
      status: (searchParams.get("status") as TicketFilters["status"]) ?? undefined,
      slaRisk: (searchParams.get("slaRisk") as TicketFilters["slaRisk"]) ?? undefined
    }),
    [searchParams]
  );

  function updateFilters(patch: Partial<TicketFilters>) {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === null) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(value));
      }
    });

    if (patch.page === undefined) {
      nextParams.set("page", "1");
    }

    setSearchParams(nextParams);
  }

  return { filters, updateFilters };
}
