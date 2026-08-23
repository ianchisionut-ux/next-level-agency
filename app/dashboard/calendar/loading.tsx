import { SkeletonHeader, SkeletonCalendarGrid } from "@/app/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <SkeletonCalendarGrid />
    </div>
  );
}
