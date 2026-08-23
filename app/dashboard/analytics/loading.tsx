import { SkeletonHeader, SkeletonStatCards, SkeletonCard } from "@/app/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonStatCards />
      <SkeletonCard lines={6} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    </div>
  );
}
