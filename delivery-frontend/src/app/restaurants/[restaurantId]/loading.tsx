import { SkeletonCard } from "@/components/states/skeleton-card";

export default function RestaurantDetailsLoading() {
  return (
    <div className="container space-y-6 py-10">
      <div className="h-[340px] animate-pulse rounded-[36px] bg-secondary" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="h-14 w-64 animate-pulse rounded-full bg-secondary" />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="h-[380px] animate-pulse rounded-[28px] bg-secondary" />
      </div>
    </div>
  );
}
