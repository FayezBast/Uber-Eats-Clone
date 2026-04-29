import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import type { OrderFilters } from "@/types";

const defaultFilters: OrderFilters = {
  search: "",
  page: 1,
  pageSize: 8,
  sortBy: "createdAt",
  sortDirection: "desc"
};

export function useOrderFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<OrderFilters>(
    () => ({
      search: searchParams.get("search") ?? defaultFilters.search,
      page: Number(searchParams.get("page") ?? defaultFilters.page),
      pageSize: Number(searchParams.get("pageSize") ?? defaultFilters.pageSize),
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      city: searchParams.get("city") ?? undefined,
      zone: searchParams.get("zone") ?? undefined,
      status: (searchParams.get("status") as OrderFilters["status"]) ?? undefined,
      paymentStatus: (searchParams.get("paymentStatus") as OrderFilters["paymentStatus"]) ?? undefined,
      storeId: searchParams.get("storeId") ?? undefined,
      courierId: searchParams.get("courierId") ?? undefined,
      orderType: (searchParams.get("orderType") as OrderFilters["orderType"]) ?? undefined,
      sortBy: (searchParams.get("sortBy") as OrderFilters["sortBy"]) ?? defaultFilters.sortBy,
      sortDirection: (searchParams.get("sortDirection") as OrderFilters["sortDirection"]) ?? defaultFilters.sortDirection
    }),
    [searchParams]
  );

  function updateFilters(patch: Partial<OrderFilters>) {
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
