import { Skeleton } from "./ui/skeleton";

const DashboardSkeleton = () => {
  return (
    <div className="space-y-8">
      {/* Stats Grid Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Emails Section Skeleton */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-[140px]" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardSkeleton;