import { SkeletonHeader, SkeletonBlock } from "@/app/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonHeader />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        <div className="space-y-3">
          <SkeletonBlock className="h-10 w-full rounded-xl" />
          <SkeletonBlock className="h-40 w-full rounded-xl" />
          <SkeletonBlock className="h-10 w-48 rounded-xl" />
        </div>
        <SkeletonBlock className="h-96 w-full rounded-xl" />
      </div>
    </div>
  );
}
