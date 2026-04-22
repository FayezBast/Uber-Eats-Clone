import { SkeletonCard } from "@/components/states/skeleton-card";

export default function RestaurantsLoading() {
  return (
    <div className="container py-10">
      <div className="mb-6 h-16 animate-pulse rounded-[28px] bg-secondary" />
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="hidden h-[520px] animate-pulse rounded-[28px] bg-secondary lg:block" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
