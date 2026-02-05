import { ArrowUpDown, Loader2 } from "lucide-react";
import StartupCard, { Startup } from "./StartupCard";
import { Button } from "./ui/button";
import StartupCardSkeleton from "./StartupCardSkeleton";

interface StartupGridProps {
  startups: Startup[];
  sortBy: string;
  onSortChange: (sort: string) => void;
  totalCount?: number;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

const StartupGrid = ({
  startups,
  sortBy,
  onSortChange,
  totalCount,
  isLoading,
  hasMore,
  onLoadMore,
  isLoadingMore
}: StartupGridProps) => {
  const sortOptions = [
    { value: "latest", label: "Latest" },
    { value: "name", label: "Name" },
    { value: "teamSize", label: "Team Size" },
  ];

  const displayCount = totalCount !== undefined
    ? `${startups.length} of ${totalCount}`
    : startups.length.toString();

  // Initial Loading State
  if (isLoading && startups.length === 0) {
    return (
      <section className="flex-1" id="directory">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-5 w-32 animate-pulse rounded bg-muted"></div>
          <div className="flex gap-2">
            <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
            <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <StartupCardSkeleton count={6} />
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1" id="directory">
      {/* Sort Controls */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{displayCount}</span> startups
        </p>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Sort by:</span>
          {sortOptions.map((option) => (
            <Button
              key={option.value}
              variant={sortBy === option.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onSortChange(option.value)}
              className="h-8"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {startups.map((startup, index) => (
          <StartupCard key={startup.id} startup={startup} index={index} />
        ))}

        {/* Loading Skeletons for Infinite Scroll */}
        {isLoadingMore && (
          <StartupCardSkeleton count={3} />
        )}
      </div>

      {/* Load More Button */}
      {hasMore && !isLoadingMore && (
        <div className="mt-12 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={onLoadMore}
            className="group min-w-[200px] rounded-full"
          >
            Load More Startups
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && startups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
            <span className="text-3xl">🔍</span>
          </div>
          <h3 className="font-display text-xl font-semibold text-foreground">No startups found</h3>
          <p className="mt-2 text-muted-foreground">Try adjusting your filters or search query</p>
        </div>
      )}
    </section>
  );
};

export default StartupGrid;
