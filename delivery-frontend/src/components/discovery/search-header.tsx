"use client";

import { Search, SlidersHorizontal, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  resultsCount: number;
  onOpenFilters: () => void;
}

export function SearchHeader({
  search,
  onSearchChange,
  resultsCount,
  onOpenFilters
}: SearchHeaderProps) {
  return (
    <div className="section-shell p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/74 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Discovery desk
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Search by restaurant, dish, or cuisine and tune the list without leaving the grid.
          </p>
        </div>
        <div className="stat-pill self-start text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{resultsCount}</span>{" "}
          {search ? "matches for this search" : "restaurants on the board"}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-12 border-white/70 bg-white/88 pl-10"
            placeholder="Search dishes, restaurants, cuisines"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" className="lg:hidden" onClick={onOpenFilters}>
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
