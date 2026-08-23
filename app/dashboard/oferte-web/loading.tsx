import { SkeletonHeader, SkeletonList } from "@/app/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonList rows={6} />
    </div>
  );
}
