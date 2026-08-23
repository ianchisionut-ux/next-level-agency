import { SkeletonHeader, SkeletonStatCards, SkeletonCard } from "@/app/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <SkeletonHeader />
      <SkeletonStatCards />
      <SkeletonCard lines={4} />
      <SkeletonCard lines={3} />
    </div>
  );
}
