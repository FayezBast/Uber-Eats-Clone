"use client";

import { BadgeDollarSign, Clock3, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { type DeliveryMode, type RestaurantFilters } from "@/types";

interface FilterSidebarProps {
  cuisines: string[];
  filters: RestaurantFilters;
  onFiltersChange: (filters: RestaurantFilters) => void;
  className?: string;
}

const sortOptions: NonNullable<RestaurantFilters["sort"]>[] = [
  "recommended",
  "fastest",
  "top-rated",
  "delivery-fee",
  "minimum-order"
];

export function FilterSidebar({
  cuisines,
  filters,
  onFiltersChange,
  className
}: FilterSidebarProps) {
  const selectedCuisines = filters.cuisines ?? [];
  const activeFilterCount =
    selectedCuisines.length +
    Number(Boolean(filters.maxDeliveryFee)) +
    Number((filters.sort ?? "recommended") !== "recommended") +
    Number((filters.deliveryMode ?? "delivery") !== "delivery");

  return (
    <Card className={cn("bg-white/80 backdrop-blur-xl", className)}>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Filter className="h-5 w-5 text-primary" />
            Filters
          </CardTitle>
          <div className="rounded-full bg-secondary/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {activeFilterCount} active
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="frost-panel space-y-3 p-4">
          <p className="text-sm font-semibold text-foreground">Order mode</p>
          <div className="grid grid-cols-2 gap-2">
            {(["delivery", "pickup"] as DeliveryMode[]).map((mode) => (
              <Button
                key={mode}
                type="button"
                variant={filters.deliveryMode === mode ? "default" : "outline"}
                className="justify-center rounded-[20px]"
                onClick={() => onFiltersChange({ ...filters, deliveryMode: mode })}
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>

        <div className="frost-panel space-y-3 p-4">
          <p className="text-sm font-semibold text-foreground">Sort by</p>
          <div className="grid gap-2">
            {sortOptions.map((sort) => (
              <Button
                key={sort}
                type="button"
                variant={filters.sort === sort ? "default" : "outline"}
                className="justify-start rounded-[20px] capitalize"
                onClick={() => onFiltersChange({ ...filters, sort })}
              >
                <Clock3 className="h-4 w-4" />
                {sort.replaceAll("-", " ")}
              </Button>
            ))}
          </div>
        </div>

        <div className="frost-panel space-y-3 p-4">
          <p className="text-sm font-semibold text-foreground">Max delivery fee</p>
          <div className="relative">
            <BadgeDollarSign className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
            <Input
              type="number"
              min={0}
              step="0.5"
              className="pl-10"
              placeholder="No cap"
              value={filters.maxDeliveryFee ?? ""}
              onChange={(event) =>
                onFiltersChange({
                  ...filters,
                  maxDeliveryFee: event.target.value ? Number(event.target.value) : undefined
                })
              }
            />
          </div>
        </div>

        <div className="frost-panel space-y-3 p-4">
          <p className="text-sm font-semibold text-foreground">Cuisine</p>
          <div className="flex flex-wrap gap-2">
            {cuisines.map((cuisine) => {
              const active = selectedCuisines.includes(cuisine);
              return (
                <Button
                  key={cuisine}
                  type="button"
                  variant={active ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() =>
                    onFiltersChange({
                      ...filters,
                      cuisines: active
                        ? selectedCuisines.filter((entry) => entry !== cuisine)
                        : [...selectedCuisines, cuisine]
                    })
                  }
                >
                  {cuisine}
                </Button>
              );
            })}
          </div>
        </div>

        <Button
          type="button"
          variant="subtle"
          className="w-full"
          onClick={() =>
            onFiltersChange({
              search: filters.search ?? "",
              cuisines: [],
              sort: "recommended",
              deliveryMode: "delivery"
            })
          }
        >
          Reset filters
        </Button>
      </CardContent>
    </Card>
  );
}
