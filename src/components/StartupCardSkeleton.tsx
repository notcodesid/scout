import { Skeleton } from "./ui/skeleton";

interface StartupCardSkeletonProps {
  count?: number;
}

const StartupCardSkeleton = ({ count = 6 }: StartupCardSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="glass-card p-5"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {/* Header with Logo */}
          <div className="mb-3 flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Tags */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-18" />
          </div>

          {/* Meta Info */}
          <div className="mb-4 flex items-center gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>

          {/* Founders */}
          <div className="border-t border-border/50 pt-3">
            <Skeleton className="h-3 w-16 mb-2" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-6 w-28 rounded-md" />
            </div>
          </div>

          {/* View Details */}
          <Skeleton className="h-4 w-24 mx-auto mt-4" />
        </div>
      ))}
    </>
  );
};

export default StartupCardSkeleton;