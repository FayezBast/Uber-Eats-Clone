import { ArrowUpRight } from "lucide-react";

import { type CategoryChip } from "@/types";

interface CategoryChipRowProps {
  categories: CategoryChip[];
}

export function CategoryChipRow({ categories }: CategoryChipRowProps) {
  return (
    <div className="flex snap-x gap-3 overflow-x-auto pb-2">
      {categories.map((category, index) => (
        <div
          key={category.id}
          className="section-shell min-w-[260px] snap-start px-5 py-5 transition duration-200 hover:-translate-y-1"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                {String(index + 1).padStart(2, "0")}
              </p>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-6 font-semibold text-foreground">{category.name}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{category.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
