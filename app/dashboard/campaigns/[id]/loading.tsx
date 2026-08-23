import { SkeletonHeader, SkeletonStatCards, SkeletonList } from "@/app/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonStatCards count={3} />
      <SkeletonList rows={4} />
    </div>
  );
}
