"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { type RestaurantFilters } from "@/types";

import { FilterSidebar } from "./filter-sidebar";

interface FilterDrawerProps {
  cuisines: string[];
  filters: RestaurantFilters;
  onFiltersChange: (filters: RestaurantFilters) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilterDrawer({
  cuisines,
  filters,
  onFiltersChange,
  open,
  onOpenChange
}: FilterDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="hidden">
          Open
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(92vw,28rem)]">
        <SheetHeader>
          <SheetTitle>Refine discovery</SheetTitle>
          <SheetDescription>Adjust cuisine, sort order, and delivery preferences.</SheetDescription>
        </SheetHeader>
        <FilterSidebar cuisines={cuisines} filters={filters} onFiltersChange={onFiltersChange} />
      </SheetContent>
    </Sheet>
  );
}
