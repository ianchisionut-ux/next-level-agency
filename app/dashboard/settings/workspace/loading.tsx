import { SkeletonHeader, SkeletonCard } from "@/app/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonCard lines={3} />
    </div>
  );
}
